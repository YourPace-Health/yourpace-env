// src/data/warmupCooldownData.js

export const WARMUP_COOLDOWN_DATA = {
  UPPER_BODY: {
    title: "Upper Body (กล้ามเนื้อส่วนบน: อก หลัง ไหล่ แขน)",
    warmupDuration: "5-7 นาที",
    cooldownDuration: "5-7 นาที",
    warmupTip: "เน้นการเคลื่อนไหวแบบ Dynamic Stretches เพื่อกระตุ้นน้ำหล่อเลี้ยงข้อต่อไหล่ สะบัก และเพิ่มอุณหภูมิในกล้ามเนื้อส่วนบน",
    cooldownTip: "เน้นการยืดเหยียดค้างไว้ (Static Stretch) 20-30 วินาที หายใจเข้า-ออกยาวๆ เพื่อลดความตึงเครียดและคลายกรดแลคติก",
    warmupExercises: [
      {
        id: "w_up_1",
        name: "Arm Circles & Shoulder Rolls",
        nameTh: "หมุนแขนและหมุนหัวไหล่",
        duration: "45 วินาที",
        target: "หัวไหล่ (Deltoids) & สะบัก (Scapula)",
        instructions: "กางแขนออกระดับไหล่ หมุนเป็นวงกลมเล็กไปข้างหน้า 20 วินาที จากนั้นหมุนย้อนกลับ 20 วินาที และหมุนหัวไหล่ขึ้น-ลง",
        icon: "🔄"
      },
      {
        id: "w_up_2",
        name: "Chest Openers & Hugs",
        nameTh: "กางแขนยืดอกสลับกอดอก",
        duration: "45 วินาที",
        target: "กล้ามเนื้ออก (Pectorals) & หลังส่วนบน (Upper Back)",
        instructions: "อ้าแขนออกกว้างพร้อมสูดลมหายใจเข้าเพื่อเปิดหน้าอก จากนั้นหุบแขนเข้ามากอดตัวเองพร้อมสลับแขนบน-ล่างช้าๆ",
        icon: "👐"
      },
      {
        id: "w_up_3",
        name: "Torso Twists with Arm Reach",
        nameTh: "บิดลำตัวเอื้อมแขนซ้าย-ขวา",
        duration: "45 วินาที",
        target: "แกนกลางลำตัว & กล้ามเนื้อปีกหลัง (Lats)",
        instructions: "ยืนกางขาเท่าช่วงไหล่ บิดลำตัวไปทางซ้ายพร้อมเอื้อมแขนขวาไปด้านข้าง สลับซ้าย-ขวาด้วยจังหวะที่นุ่มนวล",
        icon: "🔁"
      },
      {
        id: "w_up_4",
        name: "Wall or Incline Push-ups (Light)",
        nameTh: "วิดพื้นกับกำแพงแบบเบาๆ",
        duration: "10-12 ครั้ง",
        target: "กล้ามเนื้ออก ไหล่หน้า และหลังแขน",
        instructions: "วางมือทาบกำแพง ดันตัวเข้า-ออกอย่างช้าๆ โฟกัสการบีบสะบักและควบคุมแกนกลางลำตัว",
        icon: "🧱"
      },
      {
        id: "w_up_5",
        name: "Shadow Boxing & Light Shakes",
        nameTh: "ชกลมเบาๆ พร้อมสะบัดข้อมือ",
        duration: "45 วินาที",
        target: "กระตุ้นอัตราการเต้นหัวใจ & ข้อต่อแขนทั้งหมด",
        instructions: "ชกหมัดตรงสลับซ้าย-ขวาแบบผ่อนคลาย ขยับฟุตเวิร์กเบาๆ เพื่อเตรียมพร้อมทั้งร่างกาย",
        icon: "🥊"
      }
    ],
    cooldownExercises: [
      {
        id: "c_up_1",
        name: "Cross-Body Shoulder Stretch",
        nameTh: "ดึงแขนพาดลำตัวยืดหัวไหล่",
        duration: "ข้างละ 25-30 วินาที",
        target: "หัวไหล่ด้านหลัง (Posterior Deltoid)",
        instructions: "นำแขนข้างหนึ่งพาดผ่านหน้าอก ใช้แขนอีกข้างเกี่ยวและดึงเข้าหาตัวเบาๆ ไม่ยกหัวไหล่ขึ้น",
        icon: "💪"
      },
      {
        id: "c_up_2",
        name: "Overhead Triceps & Lat Stretch",
        nameTh: "ยกแขนแตะหลังยืดหลังแขนและปีก",
        duration: "ข้างละ 25-30 วินาที",
        target: "หลังแขน (Triceps) & ปีกหลัง (Latissimus)",
        instructions: "ยกแขนงอข้อศอกไปแตะกลางหลัง มืออีกข้างจับข้อศอกแล้วกดลงเบาๆ หลังตรง",
        icon: "🙋"
      },
      {
        id: "c_up_3",
        name: "Behind-the-Back Chest Opener",
        nameTh: "ประสานมือด้านหลังยืดอก",
        duration: "30 วินาที",
        target: "หน้าอก & ไหล่ด้านหน้า",
        instructions: "ประสานมือไว้ด้านหลังลำตัว ยืดแขนตรง ยกมือขึ้นเล็กน้อยพร้อมเปิดอก หายใจเข้าลึกๆ",
        icon: "🧘"
      },
      {
        id: "c_up_4",
        name: "Child's Pose with Lat Reach",
        nameTh: "ท่าเด็กหมอบเอื้อมแขนยืดปีกหลัง",
        duration: "45 วินาที",
        target: "หลังส่วนล่าง & ปีกหลัง",
        instructions: "นั่งคุกเข่า ทิ้งสะโพกทับส้นเท้า ก้มตัวเหยียดแขนทั้งสองไปข้างหน้าบนพื้น ผ่อนคลายหน้าผากลงแตะพื้น",
        icon: "🙇"
      },
      {
        id: "c_up_5",
        name: "Gentle Neck & Upper Trap Stretch",
        nameTh: "เอียงศีรษะยืดกล้ามเนื้อคอและบ่า",
        duration: "ข้างละ 20 วินาที",
        target: "ต้นคอ & บ่า (Trapezius)",
        instructions: "เอียงศีรษะไปทางไหล่ด้านใดด้านหนึ่ง ใช้มือวางเบาๆ บนศีรษะเพื่อเพิ่มแรงยืด ห้ามกระชาก",
        icon: "💆"
      }
    ]
  },

  LOWER_BODY: {
    title: "Lower Body (กล้ามเนื้อส่วนล่าง: ขา ก้น สะโพก น่อง)",
    warmupDuration: "5-7 นาที",
    cooldownDuration: "5-7 นาที",
    warmupTip: "เน้นการเปิดข้อต่อสะโพก ยืดแฮมสตริงและข้อเท้าแบบ Dynamic เพื่อลดความเสี่ยงบาดเจ็บที่ข้อเข่าและหลังส่วนล่าง",
    cooldownTip: "ยืดกล้ามเนื้อมัดใหญ่ เช่น หน้าขา ต้นขาหลัง และสะโพก ค้างไว้อย่างน้อย 30 วินาทีในแต่ละจุด",
    warmupExercises: [
      {
        id: "w_low_1",
        name: "Leg Swings (Front-to-Back & Side)",
        nameTh: "แกว่งขายืดสะโพก หน้า-หลัง และ ซ้าย-ขวา",
        duration: "ข้างละ 10-12 ครั้ง",
        target: "ข้อต่อสะโพก (Hip Flexors) & แฮมสตริง",
        instructions: "เกาะกำแพงหรือเก้าอี้เพื่อทรงตัว แกว่งขาข้างหนึ่งไปข้างหน้าและข้างหลังอย่างเป็นจังหวะ",
        icon: "🦵"
      },
      {
        id: "w_low_2",
        name: "Bodyweight Air Squats (Slow Tempo)",
        nameTh: "บอดี้เวทสควอชจังหวะช้าๆ",
        duration: "10-12 ครั้ง",
        target: "หน้าขา (Quads), ก้น (Glutes) & ข้อเข่า",
        instructions: "ยืนกางขาเท่าช่วงไหล่ ย่อตัวลงดันสะโพกไปข้างหลัง เข่าไม่เลยปลายเท้า ดันตัวขึ้นช้าๆ",
        icon: "🏋️"
      },
      {
        id: "w_low_3",
        name: "Glute Bridges (Hold at Top)",
        nameTh: "นอนยกสะโพกกระตุ้นก้น",
        duration: "12 ครั้ง (ค้าง 2 วินาที)",
        target: "กล้ามเนื้อก้น (Gluteus Maximus) & หลังล่าง",
        instructions: "นอนหงาย ชันเข่าขึ้น ส้นเท้าวางบนพื้น ออกแรงดันสะโพกขึ้นจนลำตัวตรงเป็นแนวเดียวกัน บีบก้นที่จุดสูงสุด",
        icon: "🌉"
      },
      {
        id: "w_low_4",
        name: "Standing Hip Openers (Gate Openers)",
        nameTh: "ยกเข่าหมุนเปิดสะโพกออกด้านข้าง",
        duration: "ข้างละ 10 ครั้ง",
        target: "ข้อต่อสะโพกและขาหนีบ",
        instructions: "ยกเข่าขึ้นด้านหน้าแล้วหมุนวาดออกไปด้านข้าง วางเท้าลง สลับทำทีละข้างอย่างนุ่มนวล",
        icon: "🚪"
      },
      {
        id: "w_low_5",
        name: "High Knees to Butt Kicks (Light)",
        nameTh: "วิ่งยกเข่าสูงสลับเตะก้นเบาๆ",
        duration: "45 วินาที",
        target: "กระตุ้นการไหลเวียนเลือด & ระบบประสาทกล้ามเนื้อขา",
        instructions: "วิ่งเหยาะๆ อยู่กับที่ ยกเข่าสูง 20 วินาที จากนั้นเปลี่ยนเป็นเตะส้นเท้าเข้าหาก้นอีก 25 วินาที",
        icon: "🏃"
      }
    ],
    cooldownExercises: [
      {
        id: "c_low_1",
        name: "Standing Quadriceps Stretch",
        nameTh: "พับขายืดหน้าขา",
        duration: "ข้างละ 30 วินาที",
        target: "กล้ามเนื้อหน้าขา (Quadriceps)",
        instructions: "ยืนตรง ใช้มือจับข้อเท้าดึงส้นเท้าเข้าหาก้น เข่าชิดกัน ดันสะโพกไปข้างหน้าเล็กน้อย",
        icon: "🦩"
      },
      {
        id: "c_low_2",
        name: "Standing or Seated Hamstring Stretch",
        nameTh: "ก้มยืดต้นขาด้านหลัง",
        duration: "ข้างละ 30 วินาที",
        target: "ต้นขาด้านหลัง (Hamstrings)",
        instructions: "ยื่นขาข้างหนึ่งไปข้างหน้า ส้นเท้าติดพื้น ปลายเท้าชี้ขึ้น พับตัวจากสะโพกลงไปหากล้ามเนื้อหลังขาตึง",
        icon: "🦶"
      },
      {
        id: "c_low_3",
        name: "Figure-4 or Pigeon Pose",
        nameTh: "ยืดกล้ามเนื้อสลักเพชรและก้น (Figure-4)",
        duration: "ข้างละ 35 วินาที",
        target: "กล้ามเนื้อก้นลึก (Piriformis) & สะโพก",
        instructions: "นอนหงาย วางข้อเท้าข้างหนึ่งบนเข่าอีกข้าง สอดมือดึงขาเข้าหาอกเพื่อยืดกล้ามเนื้อก้น",
        icon: "🕊️"
      },
      {
        id: "c_low_4",
        name: "Wall Calf Stretch",
        nameTh: "ยืดกล้ามเนื้อน่องกับกำแพง",
        duration: "ข้างละ 30 วินาที",
        target: "กล้ามเนื้อน่อง (Gastrocnemius & Soleus)",
        instructions: "วางมือยันกำแพง ก้าวขาข้างหนึ่งไปข้างหลัง ส้นเท้าราบติดพื้น โน้มตัวไปข้างหน้าจนน่องหลังตึง",
        icon: "🧱"
      },
      {
        id: "c_low_5",
        name: "Supine Butterfly Stretch",
        nameTh: "นอนหงายประกบเท้าผ่อนคลายขาหนีบ",
        duration: "45 วินาที",
        target: "ขาหนีบ (Adductors) & เชิงกราน",
        instructions: "นอนหงาย ประกบฝ่าเท้าเข้าหากัน ปล่อยให้เข่ากางออกตามธรรมชาติ หายใจเข้าลึกและผ่อนคลาย",
        icon: "🦋"
      }
    ]
  },

  CORE_CARDIO: {
    title: "Core & Full Body Cardio (แกนกลางและคาร์ดิโอทั่วร่างกาย)",
    warmupDuration: "5-7 นาที",
    cooldownDuration: "5-7 นาที",
    warmupTip: "เน้นการปลุกกล้ามเนื้อแกนกลาง เพิ่มความยืดหยุ่นของแนวกระดูกสันหลัง และเตรียมพร้อมระบบหัวใจและหลอดเลือด",
    cooldownTip: "เน้นการลดอัตราการเต้นหัวใจกลับสู่ภาวะปกติอย่างนุ่มนวล พร้อมยืดเหยียดแกนกลางและกล้ามเนื้อทั่วตัว",
    warmupExercises: [
      {
        id: "w_core_1",
        name: "Cat-Cow Flow",
        nameTh: "ท่าแมว-ท่าวัว ปลุกแนวกระดูกสันหลัง",
        duration: "45 วินาที (8-10 รอบ)",
        target: "แนวกระดูกสันหลัง คอ และหน้าท้อง",
        instructions: "ตั้งท่าคลาน หายใจเข้าแอ่นหลังเงยหน้า (Cow) หายใจออกโก่งหลังก้มหน้าแขม่วท้อง (Cat)",
        icon: "🐈"
      },
      {
        id: "w_core_2",
        name: "Bird-Dog Extensions",
        nameTh: "ท่ายกแขนและขาตรงข้าม",
        duration: "ข้างละ 8-10 ครั้ง",
        target: "กล้ามเนื้อแกนกลาง แกนหลัง และการทรงตัว",
        instructions: "จากท่าคลาน เหยียดแขนขวาและขาซ้ายตรงขนานพื้น เกร็งหน้าท้อง 2 วินาที แล้วสลับข้าง",
        icon: "🐕"
      },
      {
        id: "w_core_3",
        name: "Inchworm to Plank Reach",
        nameTh: "เดินมือไปข้างหน้าสู่ท่าแพลงก์",
        duration: "6-8 ครั้ง",
        target: "แฮมสตริง แกนกลาง และหัวไหล่",
        instructions: "ยืนตรง ก้มตัวแตะพื้น ค่อยๆ เดินมือไปข้างหน้าจนอยู่ในท่าแพลงก์ จากนั้นเดินมือกลับมายืน",
        icon: "🐛"
      },
      {
        id: "w_core_4",
        name: "Jumping Jacks (Low-to-Moderate)",
        nameTh: "กระโดดตบจังหวะเบาๆ",
        duration: "45 วินาที",
        target: "กระตุ้นอัตราการเต้นหัวใจทั่วร่างกาย",
        instructions: "กระโดดกางแขนและขาพร้อมกัน ลงน้ำหนักด้วยปลายเท้าอย่างนุ่มนวลเพื่อลดแรงกระแทก",
        icon: "⭐"
      },
      {
        id: "w_core_5",
        name: "Standing Knee-to-Elbow Drives",
        nameTh: "ยกเข่าแตะศอกสลับข้าง",
        duration: "45 วินาที",
        target: "กล้ามเนื้อหน้าท้องด้านข้าง (Obliques)",
        instructions: "ยกเข่าขวาขึ้นเฉียงพร้อมดึงศอกซ้ายลงมาแตะ เกร็งหน้าท้อง สลับซ้าย-ขวาอย่างกระฉับกระเฉง",
        icon: "⚡"
      }
    ],
    cooldownExercises: [
      {
        id: "c_core_1",
        name: "Cobra / Sphinx Pose",
        nameTh: "ท่างูยืดกล้ามเนื้อหน้าท้อง",
        duration: "30-40 วินาที",
        target: "กล้ามเนื้อหน้าท้อง (Abs) & กระดูกสันหลังส่วนล่าง",
        instructions: "นอนคว่ำ วางฝ่ามือระดับไหล่ ออกแรงดันตัวขึ้นเปิดหน้าอก ไหล่ห่างจากหู ไม่บีบหลังล่างเกินไป",
        icon: "🐍"
      },
      {
        id: "c_core_2",
        name: "Child's Pose with Deep Breathing",
        nameTh: "ท่าเด็กหมอบฝึกการหายใจลึก",
        duration: "45-60 วินาที",
        target: "ผ่อนคลายกล้ามเนื้อหลังและระบบประสาท",
        instructions: "นั่งทับส้นเท้า ก้มตัวเหยียดแขนไปข้างหน้า หายใจเข้าลึก 4 วินาที กลั้น 2 วินาที หายใจออก 6 วินาที",
        icon: "🧘"
      },
      {
        id: "c_core_3",
        name: "Lying Spinal Twist",
        nameTh: "นอนหงายบิดสะโพกคลายกล้ามเนื้อหลัง",
        duration: "ข้างละ 30 วินาที",
        target: "หลังส่วนล่าง สะโพก และเอว",
        instructions: "นอนหงาย กางแขนออกระดับไหล่ ดึงเข่าข้างหนึ่งข้ามลำตัวไปแตะพื้นฝั่งตรงข้าม ไหล่ทั้งสองติดพื้น",
        icon: "🌀"
      },
      {
        id: "c_core_4",
        name: "Knees-to-Chest Hug",
        nameTh: "กอดเข่าชิดอกคลายหลังล่าง",
        duration: "30-40 วินาที",
        target: "กล้ามเนื้อหลังส่วนล่างและก้น",
        instructions: "นอนหงาย ดึงเข่าทั้งสองข้างเข้าหาหน้าอก ใช้แขนกอดเข่าไว้ กลิ้งตัวซ้าย-ขวาเบาๆ เพื่อคลายหลัง",
        icon: "🤗"
      },
      {
        id: "c_core_5",
        name: "Full Body Pencil Stretch",
        nameTh: "ยืดเหยียดเต็มตัวดิ่งปลายเท้า",
        duration: "30 วินาที",
        target: "ยืดแนวกระดูกสันหลังทั่วทั้งร่างกาย",
        instructions: "นอนหงาย เหยียดแขนขึ้นเหนือศีรษะ เหยียดปลายเท้าชี้ตรงออกไป ยืดร่างกายให้ยาวที่สุดพร้อมหายใจยาวๆ",
        icon: "📏"
      }
    ]
  }
};

/**
 * วิเคราะห์ประเภทกล้ามเนื้ออัตโนมัติจากชื่อกิจกรรม หรือรายละเอียด
 * @param {string} title - ชื่อกิจกรรม เช่น "Upper Body & Core", "Leg Day", "Cardio Fat Burn"
 * @param {string} description - รายละเอียด
 * @returns {"UPPER_BODY" | "LOWER_BODY" | "CORE_CARDIO"}
 */
export function detectWorkoutMuscleCategory(title = "", description = "") {
  const combined = `${title} ${description}`.toLowerCase();
  
  if (
    combined.includes("upper") || 
    combined.includes("chest") || 
    combined.includes("shoulder") || 
    combined.includes("back") || 
    combined.includes("arm") || 
    combined.includes("bicep") || 
    combined.includes("tricep") ||
    combined.includes("อก") ||
    combined.includes("ไหล่") ||
    combined.includes("หลัง") ||
    combined.includes("แขน")
  ) {
    return "UPPER_BODY";
  }

  if (
    combined.includes("lower") || 
    combined.includes("leg") || 
    combined.includes("squat") || 
    combined.includes("lunge") || 
    combined.includes("glute") || 
    combined.includes("quad") ||
    combined.includes("hamstring") ||
    combined.includes("ขา") ||
    combined.includes("ก้น") ||
    combined.includes("สะโพก") ||
    combined.includes("น่อง")
  ) {
    return "LOWER_BODY";
  }

  return "CORE_CARDIO";
}
