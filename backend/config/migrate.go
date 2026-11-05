package config

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"

	"gorm.io/gorm"
)

// Versioned SQL migrations complement GORM's AutoMigrate: AutoMigrate adds tables
// and columns, while migrations carry the changes it cannot express (index tweaks,
// data fixes, renames). Files are applied once, in name order, each in a transaction.
//
//go:embed migrations/*.sql
var migrationFiles embed.FS

const migrationsTable = "schema_migrations"

// pendingMigrations returns the file names (sorted) that are not yet applied.
func pendingMigrations(all []string, applied map[string]bool) []string {
	var out []string
	for _, name := range all {
		if strings.HasSuffix(name, ".sql") && !applied[name] {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	return out
}

// RunMigrations applies every pending migration from the embedded migrations folder.
func RunMigrations(db *gorm.DB) error {
	return runMigrations(db, migrationFiles, "migrations")
}

func runMigrations(db *gorm.DB, fsys fs.FS, dir string) error {
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS ` + migrationsTable + ` (
		version    text PRIMARY KEY,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`).Error; err != nil {
		return fmt.Errorf("create %s: %w", migrationsTable, err)
	}

	var appliedList []string
	if err := db.Raw(`SELECT version FROM ` + migrationsTable).Scan(&appliedList).Error; err != nil {
		return err
	}
	applied := make(map[string]bool, len(appliedList))
	for _, v := range appliedList {
		applied[v] = true
	}

	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}

	for _, name := range pendingMigrations(names, applied) {
		sqlBytes, err := fs.ReadFile(fsys, dir+"/"+name)
		if err != nil {
			return err
		}
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(sqlBytes)).Error; err != nil {
				return err
			}
			return tx.Exec(`INSERT INTO `+migrationsTable+` (version) VALUES (?)`, name).Error
		})
		if err != nil {
			return fmt.Errorf("migration %s failed: %w", name, err)
		}
		log.Printf("Applied migration %s", name)
	}
	return nil
}
