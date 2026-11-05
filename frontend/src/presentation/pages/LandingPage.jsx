import { clickable } from '../utils/a11y';
import { ArrowRight, Bot, Sparkles, TrendingUp, Target, Calendar, Clock, Heart, Users, Smile, Meh, Frown, BatteryCharging, Dumbbell } from 'lucide-react';

// Marketing landing page shown to visitors who are not logged in
export const LandingPage = ({
  onGetStarted,
  checkinStatus,
  isAnalyzing,
  aiRecommendation,
  handleCheckin,
  equipmentOptions,
  selectedEquipment,
  handleEquipmentToggle
}) => {
  return (
  <div className="app-container">
    {/* Navigation Bar */}
    <header className="navbar animate-fade-in">
      <div className="logo-container" {...clickable(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}>
        <div className="logo-badge">yP</div>
        <span className="logo-text">yourPace</span>
      </div>
      <div className="nav-actions">
        <button className="btn btn-outline" onClick={() => onGetStarted()}>Sign In</button>
        <button className="btn btn-primary" onClick={() => onGetStarted()}>Get Started</button>
      </div>
    </header>

    {/* Main Hero Section */}
    <section className="hero-section animate-slide-up" id="hero">
      <div className="hero-content">
        <h1 className="hero-title">
          Your Personal <br />
          <span className="highlight-green">Health</span> <br />
          <span className="highlight-blue">Mentor</span>
        </h1>
        <p className="hero-desc">
          สัมผัสประสบการณ์การโค้ชฟิตเนสและดูแลสุขภาพด้วยพลัง AI ส่วนตัว
          ปรับแผนโภชนาการและการออกกำลังกายตามสภาพร่างกายและอารมณ์ของคุณ
          พร้อมออกแบบเฉพาะให้สอดคล้องกับอุปกรณ์ที่คุณมีจริงที่บ้าน
        </p>
        <div className="hero-cta">
          <button className="btn btn-large btn-primary" onClick={() => onGetStarted()}>
            Start Your Journey <ArrowRight size={18} />
          </button>
          <a href="#features-anchor" className="btn btn-large btn-secondary-outline">
            Learn More
          </a>
        </div>

        <div className="hero-social-proof">
          <span className="stars">
            {"★★★★★".split("").map((star, idx) => <span key={idx}>★</span>)}
          </span>
          <span>Trusted by health enthusiasts — 1,000+ active users</span>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-card" {...clickable(() => onGetStarted())}>
          <div className="card-icon-wrapper icon-green">
            <Bot size={28} />
          </div>
          <div className="card-text">
            <h3 className="card-title">AI-Powered Coaching</h3>
            <p className="card-desc">รับแผนการออกกำลังกายที่ออกแบบเฉพาะบุคคลและคำแนะนำแบบเรียลไทม์จาก AI แสนอัจฉริยะ</p>
          </div>
        </div>

        <div className="hero-card" {...clickable(() => onGetStarted())}>
          <div className="card-icon-wrapper icon-blue">
            <TrendingUp size={28} />
          </div>
          <div className="card-text">
            <h3 className="card-title">Smart Tracking</h3>
            <p className="card-desc">ติดตามความคืบหน้าด้านสุขภาพด้วยระบบวิเคราะห์ข้อมูลร่างกายและคำแนะนำเชิงลึก</p>
          </div>
        </div>

        <div className="hero-card" {...clickable(() => onGetStarted())}>
          <div className="card-icon-wrapper icon-pink">
            <Target size={28} />
          </div>
          <div className="card-text">
            <h3 className="card-title">Personalized Goals</h3>
            <p className="card-desc">บรรลุเป้าหมายการมีสุขภาพดีอย่างยั่งยืน โดยปรับให้สอดคล้องกับรูปแบบชีวิตจริงของคุณ</p>
          </div>
        </div>
      </div>
    </section>

    {/* Interactive Widget Section: ลองเช็คอินและออกแบบแผนกับ AI */}
    <section className="features-section" id="interactive-demo" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginBottom: '80px', padding: '60px 24px' }}>
      <span className="section-tag">Interactive Preview</span>
      <h2 className="section-title">ลองทดสอบระบบวิเคราะห์ของ yourPace</h2>
      <p className="section-desc">ลองสัมผัสประสบการณ์จริงของฟีเจอร์เด่นของเรา: ระบบแนะนำการออกกำลังกายตามอุปกรณ์ และการเช็คอินสุขภาพเพื่อรับคำแนะนำจาก AI</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>

        {/* Column 1: Config Equipment */}
        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid #edf2f7' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dumbbell size={22} color="var(--primary)" /> 1. อุปกรณ์ที่คุณมีในตอนนี้
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            AI ของเราจะคัดเลือกท่าออกกำลังกายที่ทำได้จริงทันทีโดยอิงจากอุปกรณ์ที่คุณเลือกด้านล่างนี้
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {equipmentOptions.map((eq) => {
              const isSelected = selectedEquipment.includes(eq.id);
              return (
                <div
                  key={eq.id}
                  {...clickable(() => handleEquipmentToggle(eq.id))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--primary-light)' : '#ffffff',
                    border: `1px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? 'var(--primary-hover)' : 'var(--text-dark)',
                    transition: 'var(--transition)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{eq.icon}</span>
                    <span>{eq.name}</span>
                  </span>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--primary)' : '#cbd5e1'}`,
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    {isSelected && '✓'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Emotional/Physical Check-in */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={22} color="var(--accent-pink)" /> 2. วันนี้สภาพร่างกาย/จิตใจของคุณเป็นอย่างไร?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            การเช็คอินแบบองค์รวม (Physical & Mental Check-in) ช่วยให้ AI ปรับตารางตามความเหนื่อยล้าหรือระดับความเครียดในแต่ละวัน
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <button
              onClick={() => handleCheckin('energetic')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${checkinStatus === 'energetic' ? 'var(--primary)' : '#e2e8f0'}`,
                background: checkinStatus === 'energetic' ? 'var(--primary-light)' : '#ffffff',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <BatteryCharging size={28} color={checkinStatus === 'energetic' ? 'var(--primary)' : 'var(--text-muted)'} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>มีพลัง</span>
            </button>

            <button
              onClick={() => handleCheckin('tired')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${checkinStatus === 'tired' ? '#3182ce' : '#e2e8f0'}`,
                background: checkinStatus === 'tired' ? 'var(--secondary-light)' : '#ffffff',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <Meh size={28} color={checkinStatus === 'tired' ? 'var(--secondary)' : 'var(--text-muted)'} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>เหนื่อยล้า</span>
            </button>

            <button
              onClick={() => handleCheckin('stressed')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${checkinStatus === 'stressed' ? 'var(--accent-pink)' : '#e2e8f0'}`,
                background: checkinStatus === 'stressed' ? 'var(--accent-pink-light)' : '#ffffff',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <Frown size={28} color={checkinStatus === 'stressed' ? 'var(--accent-pink)' : 'var(--text-muted)'} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>เคร่งเครียด</span>
            </button>

            <button
              onClick={() => handleCheckin('focused')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${checkinStatus === 'focused' ? '#805ad5' : '#e2e8f0'}`,
                background: checkinStatus === 'focused' ? '#faf5ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <Smile size={28} color={checkinStatus === 'focused' ? '#805ad5' : 'var(--text-muted)'} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>มีสมาธิ</span>
            </button>
          </div>

          {/* AI Output box */}
          <div style={{
            minHeight: '120px',
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {!checkinStatus && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                <Sparkles size={24} color="#a0aec0" style={{ marginBottom: '8px' }} />
                <p>กดเลือกสภาพร่างกายด้านบน เพื่อรับคำแนะนำโปรแกรมออกกำลังกายจาก AI ทันที</p>
              </div>
            )}

            {checkinStatus && isAnalyzing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner" style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #e2e8f0',
                  borderTop: '3px solid var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '500' }}>
                  AI กำลังวิเคราะห์ร่วมกับอุปกรณ์ของคุณ...
                </span>
              </div>
            )}

            {checkinStatus && !isAnalyzing && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px' }}>
                    คำแนะนำ AI mentor ของคุณ
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-dark)', lineHeight: '1.6', fontWeight: '500' }}>
                  {aiRecommendation}
                </p>
                <div style={{ borderTop: '1px solid #edf2f7', marginTop: '12px', paddingTop: '8px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>อุปกรณ์ที่เลือก: {selectedEquipment.map(id => equipmentOptions.find(e => e.id === id)?.icon).join(' ')}</span>
                  <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} {...clickable(() => onGetStarted())}>บันทึกแผนและเริ่มใช้งานจริง →</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>

    {/* Why Choose yourPace Section */}
    <section className="features-section" id="features-anchor">
      <span className="section-tag">Why Choose yourPace</span>
      <h2 className="section-title">ทุกสิ่งที่คุณต้องการเพื่อบรรลุเป้าหมาย</h2>
      <p className="section-desc">รวบรวมฟังก์ชันการช่วยดูแลสุขภาพที่ครบถ้วนและตอบโจทย์ทุกความต้องการในการพัฒนาตนเองอย่างมีประสิทธิภาพสูงสุด</p>

      <div className="features-grid">
        <div className="feature-item">
          <div className="feature-item-icon" style={{ backgroundColor: '#e6f4ea', color: 'var(--primary)' }}>
            <Calendar size={24} />
          </div>
          <h3 className="feature-item-title">Context-Aware Plans</h3>
          <p className="feature-item-desc">
            ปรับแผนการออกกำลังกายโดยอัตโนมัติตามตารางชีวิต อุปกรณ์ที่มีอยู่จริงในแต่ละวัน
            ตลอดจนระดับพลังงานร่างกายและสภาพอารมณ์ของคุณ
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-item-icon" style={{ backgroundColor: '#e8f0fe', color: 'var(--secondary)' }}>
            <Bot size={24} />
          </div>
          <h3 className="feature-item-title">Real-Time Support</h3>
          <p className="feature-item-desc">
            รับคำแนะนำ ข้อเสนอแนะ หรือตอบข้อสงสัยเกี่ยวกับการออกกำลังกายและโภชนาการได้ทันทีจาก AI Mentor ประจำตัวคุณ
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-item-icon" style={{ backgroundColor: '#fce8e6', color: 'var(--accent-pink)' }}>
            <Heart size={24} />
          </div>
          <h3 className="feature-item-title">Holistic Wellness</h3>
          <p className="feature-item-desc">
            ดูแลสุขภาพอย่างสมบูรณ์แบบทั้งการฝึกซ้อมร่างกาย โภชนาการอาหารที่เหมาะสม
            รวมถึงสภาพจิตใจและความเครียดในหนึ่งเดียว
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-item-icon" style={{ backgroundColor: '#e8f0fe', color: 'var(--secondary)' }}>
            <TrendingUp size={24} />
          </div>
          <h3 className="feature-item-title">Advanced Analytics</h3>
          <p className="feature-item-desc">
            วิเคราะห์ตัวเลขสถิติสุขภาพอย่างแม่นยำ เข้าใจพัฒนาการตนเองผ่านแดชบอร์ดสุขภาพ (Health Dashboard)
            ที่แสดงแนวโน้มอย่างเข้าใจง่าย
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-item-icon" style={{ backgroundColor: '#faf5ff', color: '#805ad5' }}>
            <Clock size={24} />
          </div>
          <h3 className="feature-item-title">24/7 Availability</h3>
          <p className="feature-item-desc">
            โค้ชส่วนตัวอัจฉริยะของคุณพร้อมสแตนด์บายช่วยเหลือคุณตลอด 24 ชั่วโมง 7 วันทำการ
            ไม่ว่าจะดึกแค่ไหนหรือเช้ามืดเท่าไร
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-item-icon" style={{ backgroundColor: '#fffaf0', color: '#dd6b20' }}>
            <Users size={24} />
          </div>
          <h3 className="feature-item-title">Community Support</h3>
          <p className="feature-item-desc">
            ร่วมแบ่งปันผลลัพธ์และความก้าวหน้า ตลอดจนรับแรงผลักดันและกำลังใจที่ดีจากกลุ่มสังคมผู้รักสุขภาพใน yourPace
          </p>
        </div>
      </div>
    </section>

    {/* CTA Box Section */}
    <section className="cta-section">
      <div className="cta-box">
        <h2 className="cta-title">พร้อมที่จะเปลี่ยนสุขภาพของคุณแล้วหรือยัง?</h2>
        <p className="cta-desc">
          เริ่มต้นใช้งาน yourPace วันนี้เพื่อการออกกำลังกายที่ปรับตามไลฟ์สไตล์คุณอย่างแท้จริง
          ก้าวไปสู่เป้าหมายสุขภาพที่ดีกว่าในแบบที่เป็นตัวคุณเอง
        </p>
        <button className="btn btn-large btn-primary" onClick={() => onGetStarted()}>
          Get Started Free Today
        </button>
      </div>
    </section>

    {/* Footer Section */}
    <footer className="footer">

      <div className="footer-grid">
        <div className="footer-brand">
          <div className="logo-container" {...clickable(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}>
            <div className="logo-badge">yP</div>
            <span className="logo-text">yourPace</span>
          </div>
          <p className="footer-brand-desc">
            Your Personal AI Health & Fitness Mentor. เพื่อนคู่คิดการออกกำลังกายและดูแลสุขภาพรายวันของคุณ
          </p>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">Product</h4>
          <ul className="footer-links">
            <li><a href="#features-anchor">Features</a></li>
            <li><a href="#interactive-demo">Interactive Demo</a></li>
            <li><a href="#hero">Pricing</a></li>
            <li><a href="#hero">Blog</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">Company</h4>
          <ul className="footer-links">
            <li><a href="#hero">About Us</a></li>
            <li><a href="#hero">Careers</a></li>
            <li><a href="#hero">Contact</a></li>
            <li><a href="#hero">Press</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">Legal</h4>
          <ul className="footer-links">
            <li><a href="#hero">Privacy Policy</a></li>
            <li><a href="#hero">Terms of Service</a></li>
            <li><a href="#hero">Security Guidelines</a></li>
            <li><a href="#hero">Cookies Settings</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 yourPace. All rights reserved.</p>
      </div>
    </footer>
  </div>
  );
};
