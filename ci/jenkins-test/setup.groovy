import jenkins.model.*
import hudson.security.*
import hudson.model.*
import hudson.plugins.git.*
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition

def j = Jenkins.get()

// local admin for this throwaway instance (password comes from the container environment)
def realm = new HudsonPrivateSecurityRealm(false)
realm.createAccount('admin', System.getenv('TEST_ADMIN_PASSWORD'))
j.setSecurityRealm(realm)
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
j.setAuthorizationStrategy(strategy)
j.setCrumbIssuer(null) // test instance only: lets curl trigger builds without a crumb dance

// the job: Pipeline script from SCM, reading the Jenkinsfile of the mounted repo
def branch = System.getenv('TEST_BRANCH') ?: 'main'
def scm = new GitSCM(
    GitSCM.createRepoList('/repo', null),
    [new BranchSpec('*/' + branch)],
    null, null, [])
def job = j.getItem('yourpace-ci') ?: j.createProject(WorkflowJob, 'yourpace-ci')
job.setDefinition(new CpsScmFlowDefinition(scm, 'Jenkinsfile'))
// declare the DEPLOY parameter up front so the very first build can already say DEPLOY=false
job.addProperty(new ParametersDefinitionProperty(new BooleanParameterDefinition('DEPLOY', true, 'deploy after a green build')))
job.save()

j.save()
println 'yourpace-ci test job ready'
