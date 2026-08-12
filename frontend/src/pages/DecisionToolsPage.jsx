import React from 'react';
import { Home, BookOpen, Navigation, Calculator, Bot, Calendar, Bookmark, FileText, Settings, User, Search, Percent, Truck, Store, Megaphone, Users } from 'lucide-react';
import styles from './DecisionToolsPage.module.css';

const DecisionToolsPage = () => {
  return (
    <div className={`${styles.page} min-h-screen flex bg-warm-paper font-sans relative overflow-hidden`}>
      {/* Abstract Background Elements */}
      <div className={`${styles.orb} ${styles.orbA} absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full mix-blend-multiply filter blur-[100px] opacity-10`}></div>
      <div className={`${styles.orb} ${styles.orbB} absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full mix-blend-multiply filter blur-[120px] opacity-10`}></div>

      {/* Main Rail Sidebar (72px) */}
      <div className={`${styles.rail} w-[72px] bg-deep-petrol flex flex-col items-center py-6 z-10 shadow-xl border-r border-[var(--brand-600)]`}>
        <div className={`${styles.railLogo} w-8 h-8 font-bold text-xl text-warm-paper mb-10 bg-[var(--brand-400)] flex items-center justify-center rounded-lg`}>
          K
        </div>
        
        <div className={`${styles.railNav} flex flex-col gap-6 w-full items-center`}>
          <SidebarIcon icon={<Home size={20} />} label="Home" />
          <SidebarIcon icon={<BookOpen size={20} />} label="Courses" />
          <SidebarIcon icon={<Navigation size={20} />} label="Decision" active />
          <SidebarIcon icon={<Calculator size={20} />} label="Finance Center" />
          <SidebarIcon icon={<Bot size={20} />} label="AI Mentor" />
          <SidebarIcon icon={<Calendar size={20} />} label="Business Calendar" />
          <SidebarIcon icon={<Bookmark size={20} />} label="Saved" />
          <SidebarIcon icon={<FileText size={20} />} label="News" />
        </div>

        <div className={`${styles.railFooter} mt-auto flex flex-col gap-6 items-center w-full`}>
          <SidebarIcon icon={<Settings size={20} />} label="Settings" />
          <div className={`${styles.railProfile} flex flex-col items-center gap-1 cursor-pointer`}>
            <div className={`${styles.railAvatar} w-8 h-8 bg-gray-300 rounded-full overflow-hidden border border-white`}>
               <User size={20} className="w-full h-full p-1 text-gray-500 bg-white" />
            </div>
            <span className="text-[10px] text-gray-400">Admin</span>
          </div>
        </div>
      </div>

      {/* Context Panel (240px) */}
      <div className={`${styles.contextPanel} w-[240px] bg-deep-petrol z-10 flex flex-col py-6`}>
        <div className="px-4 mb-8">
          <div className={`${styles.contextSearch} relative`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Ara" 
              className={`${styles.contextInput} w-full bg-[var(--brand-600)] text-white text-sm rounded-lg pl-9 pr-4 py-2 outline-none border border-[var(--brand-600)] focus:border-[var(--brand-400)] placeholder-gray-400`}
            />
          </div>
        </div>

        <div className="px-4 mb-4 text-white font-semibold text-lg">Karar Araçları</div>

        <div className="flex flex-col text-sm text-gray-300">
          <ContextMenuItem label="Karar Araçları" />
          <ContextMenuItem label="Ürünüm Gerçekten Kârlı mı?" />
          <ContextMenuItem label="Decision Tools" />
          <ContextMenuItem label="Finance Center" />
          <ContextMenuItem label="Bu İndirimi Yapabilir Miyim?" />
          <ContextMenuItem label="Pazaryeri Komisyonundan Sonra Ne Kalıyor?" />
          <ContextMenuItem label="Reklam Bütçemi Artırmalı Mıyım?" />
          <ContextMenuItem label="Yeni Personel Alabilir Miyim?" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${styles.main} flex-1 flex flex-col p-8 z-10 relative`}>
        {/* Top Panel (Signature Dark Panel) */}
        <div className={`${styles.hero} glow-panel rounded-2xl p-10 mb-8 flex flex-col items-center justify-center relative overflow-hidden mirror-edge shadow-lg`}>
           {/* Mirror Sweep Animation Layer */}
           <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.05)_50%,transparent_55%)] bg-[length:250%_250%,100%_100%] animate-mirror-sweep pointer-events-none"></div>

           <p className="text-gray-400 text-sm mb-2 relative z-10 tracking-widest uppercase">Signature Dark Panel</p>
           <h1 className="text-3xl font-bold text-white mb-8 relative z-10 tracking-tight">Karar Araçları: İşiniz İçin En İyi Seçimleri Yapın</h1>
           
           <div className={`${styles.heroSearch} relative w-[500px] z-10`}>
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300" size={20} />
              <input 
                type="text" 
                placeholder="Quick Search" 
                className={`${styles.heroInput} w-full bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full px-6 py-3 outline-none focus:bg-white/20 transition-all placeholder-gray-300 shadow-inner`}
              />
           </div>
        </div>

        {/* Cards Grid */}
        <div className={`${styles.grid} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
           <DecisionCard 
             title="Ürünüm Gerçekten Kârlı mı?"
             icon={<Calculator size={48} strokeWidth={1.5} className="text-deep-petrol" />}
             status="Devam Ediyor"
             desc="Ürünüm gerçekten karlı mı? Tüm da kardanemesini içinin som aknravitaini çilnstem yapın."
             actionText="Devam Et"
             primary
           />
           <DecisionCard 
             title="Bu İndirimi Yapabilir miyim?"
             icon={<Percent size={48} strokeWidth={1.5} className="text-deep-petrol" />}
             status="Tamamlandı"
             desc="Bu indirimi yapabilir miyim? Bunun indirimin sonucu görden sinta, ioran ltan tamomandan."
             actionText="Sonucu Gör"
           />
           <DecisionCard 
             title="Kargo Ücretsiz Olabilir mi?"
             icon={<Truck size={48} strokeWidth={1.5} className="text-deep-petrol" />}
             status="Devam Ediyor"
             desc="Kargo ücretsiz olabilir mi? Duran yeni delivery daris-ur flamgr hahze boiruniro kuzaııtı yantrominottern raanır."
             actionText="Devam Et"
           />
           <DecisionCard 
             title="Pazaryeri Komisyonundan Sonra Ne Kalıyor?"
             icon={<Store size={48} strokeWidth={1.5} className="text-deep-petrol" />}
             status="Başlanmadı"
             desc="Pazaryeri komisyonundan sonra ne kalıyor? Marketplace commission calculation logic helps..."
             actionText="Başla"
           />
           <DecisionCard 
             title="Reklam Bütçemi Artırmalı Mıyım?"
             icon={<Megaphone size={48} strokeWidth={1.5} className="text-deep-petrol" />}
             status="Tamamlandı"
             desc="Reklam bütçemi artırmalı mıyım? Bu analytics ve moals avon on soğ con version optimization."
             actionText="Sonucu Gör"
           />
           <DecisionCard 
             title="Yeni Personel Alabilir Miyim?"
             icon={<Users size={48} strokeWidth={1.5} className="text-deep-petrol" />}
             status="Başlanmadı"
             desc="Yeni personel alabilir miyim? Bovxm team avatars in team then ve snpım ad and HR limits."
             actionText="Başla"
           />
        </div>
      </div>
    </div>
  );
};

// Sub-components

const SidebarIcon = ({ icon, label, active }) => (
  <div className={`${styles.sidebarIcon} flex flex-col items-center gap-1 cursor-pointer group relative w-full`} title={label}>
    <div className={`${styles.sidebarIconBox} ${active ? styles.sidebarIconActive : ''} p-2 rounded-lg transition-colors ${active ? 'bg-warm-paper text-deep-petrol' : 'text-gray-400 hover:text-white hover:bg-[var(--brand-400)]'}`}>
      {icon}
    </div>
    {/* Optional tooltips if needed */}
  </div>
);

const ContextMenuItem = ({ label }) => (
  <div className={`${styles.contextItem} px-4 py-2.5 cursor-pointer hover:bg-deep-petrol-hover transition-colors rounded-lg mx-2 mb-1 truncate`}>
    {label}
  </div>
);

const DecisionCard = ({ title, icon, status, desc, actionText, primary }) => {
  let statusColor = "bg-gray-100 text-gray-600";
  if (status === "Devam Ediyor") statusColor = "bg-amber-100 text-amber-700 border border-amber-200";
  if (status === "Tamamlandı") statusColor = "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (status === "Başlanmadı") statusColor = "bg-slate-100 text-slate-600 border border-slate-200";

  const statusClass = status === "Devam Ediyor"
    ? styles.statusProgress
    : status === "TamamlandÄ±"
      ? styles.statusCompleted
      : styles.statusNew;

  return (
    <div className={`${styles.card} glass-card rounded-2xl p-6 mirror-edge relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 flex flex-col h-full border border-white/50`}>
       {/* Mirror Sweep Animation on Card */}
       <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] bg-[length:250%_250%,100%_100%] animate-mirror-sweep pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
       
       <div className="flex justify-between items-start mb-4 relative z-10">
         <h3 className="text-xl font-bold text-deep-petrol w-3/5 leading-tight">{title}</h3>
         <div className="p-2">
            {icon}
         </div>
       </div>

       <div className="mb-4 relative z-10">
         <span className={`${styles.status} ${statusClass} text-xs px-3 py-1 rounded-full font-medium ${statusColor}`}>
           {status}
         </span>
       </div>

       <p className="text-sm text-gray-600 mb-8 flex-1 relative z-10">
         {desc}
       </p>

       <button className={`${styles.cardButton} w-full bg-deep-petrol text-white py-3 rounded-xl font-medium transition-colors hover:bg-deep-petrol-hover relative z-10 shadow-md`} data-tactile="secondary">
         {actionText}
       </button>
    </div>
  );
};

export default DecisionToolsPage;
