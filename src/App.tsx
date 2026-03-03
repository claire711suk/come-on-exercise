/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Calendar, Trophy, Share2, Heart, Bell, X, Check, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface CheckIn {
  id: string;
  timestamp: number;
  photo: string;
  isLate: boolean;
  userId: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  isMe: boolean;
}

// --- Constants & Mock Data ---
const MOCK_USERS: User[] = [
  { id: 'me', name: '我', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isMe: true },
  { id: 'friend1', name: '阿强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', isMe: false },
  { id: 'friend2', name: '小美', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Caleb', isMe: false },
  { id: 'friend3', name: '大壮', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn', isMe: false },
];

const STORAGE_KEY = 'sweat_weekly_data';

// --- Helper Functions ---
const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

const getYesterday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday.getTime();
};

export default function App() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isLateCheckIn, setIsLateCheckIn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Room ID
  useEffect(() => {
    let id = localStorage.getItem('sweat_room_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('sweat_room_id', id);
    }
    setRoomId(id);
  }, []);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const startOfWeek = getStartOfWeek();
        const currentWeekCheckIns = parsed.filter((c: CheckIn) => c.timestamp >= startOfWeek);
        setCheckIns(currentWeekCheckIns);
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkIns));
  }, [checkIns]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handlePoke = (name: string) => {
    showToast(`已发送催促提醒给 ${name} ✨`);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast("邀请链接已复制到剪贴板 🔗");
    }).catch(() => {
      showToast("复制失败，请手动复制");
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string);
        setShowCamera(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitCheckIn = () => {
    if (!previewPhoto) return;

    const newCheckIn: CheckIn = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: isLateCheckIn ? getYesterday() + 3600000 * 12 : Date.now(),
      photo: previewPhoto,
      isLate: isLateCheckIn,
      userId: 'me',
    };

    const targetDate = new Date(newCheckIn.timestamp).toDateString();
    const alreadyDone = checkIns.some(c => c.userId === 'me' && new Date(c.timestamp).toDateString() === targetDate);

    if (alreadyDone) {
      showToast("今天已经打过卡啦，明天再来吧！");
    } else {
      setCheckIns([...checkIns, newCheckIn]);
      showToast(isLateCheckIn ? "补签成功！" : "打卡成功！加油！");
    }

    setShowCamera(false);
    setPreviewPhoto(null);
    setIsLateCheckIn(false);
  };

  const generateReport = () => {
    setShowReport(true);
  };

  const userStats = MOCK_USERS.map(user => {
    const userCheckIns = checkIns.filter(c => c.userId === user.id);
    
    // Calculate 7-day status (Monday to Sunday)
    const startOfWeek = getStartOfWeek();
    const dayStatus = Array(7).fill(false);
    
    userCheckIns.forEach(c => {
      const date = new Date(c.timestamp);
      let dayIndex = date.getDay(); // 0 is Sun, 1 is Mon...
      dayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to 0=Mon, 6=Sun
      if (dayIndex >= 0 && dayIndex < 7) {
        dayStatus[dayIndex] = true;
      }
    });

    // For mock friends, if they have 0 real check-ins, simulate some random ones for demo
    let finalDayStatus = dayStatus;
    if (!user.isMe && userCheckIns.length === 0) {
      const randomCount = Math.floor(Math.random() * 4) + 1;
      finalDayStatus = Array(7).fill(false).map((_, i) => i < randomCount);
    }
    
    const finalCount = finalDayStatus.filter(Boolean).length;
    return { ...user, count: finalCount, dayStatus: finalDayStatus };
  }).sort((a, b) => b.count - a.count);

  const isSunday = new Date().getDay() === 0;

  return (
    <div className="min-h-screen text-charcoal flex flex-col items-center p-6 pb-32 max-w-md mx-auto relative overflow-x-hidden">
      {/* Background Blobs */}
      <div className="bg-blobs">
        <div className="blob w-64 h-64 bg-vibrant-purple -top-20 -left-20" />
        <div className="blob w-80 h-80 bg-vibrant-pink top-1/2 -right-20" />
        <div className="blob w-72 h-72 bg-vibrant-yellow bottom-0 -left-20" />
      </div>

      {/* Header */}
      <header className="w-full mb-8 mt-4 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-6">
          <div className="bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/30">
            <p className="text-[10px] font-black text-vibrant-indigo/60 uppercase">Room ID</p>
            <p className="text-xs font-black text-vibrant-indigo">#{roomId}</p>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-vibrant-indigo absolute left-1/2 -translate-x-1/2">来呀！运动呀</h1>
          <button 
            onClick={() => setShowInvite(true)}
            className="p-3 bg-vibrant-yellow rounded-2xl shadow-md border border-white/50 active:scale-90 transition-transform"
          >
            <Share2 className="w-5 h-5 text-vibrant-indigo" />
          </button>
        </div>
        
        <div className="w-full bg-gradient-to-br from-vibrant-purple to-vibrant-indigo p-6 rounded-[32px] shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Weekly Progress</p>
            <h2 className="text-3xl font-black mb-4">我的本周状态</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex gap-1.5 mb-2">
                  {(userStats.find(u => u.isMe)?.dayStatus || Array(7).fill(false)).map((active, i) => (
                    <div 
                      key={i} 
                      className={`h-2 flex-1 rounded-full transition-all duration-500 ${active ? 'bg-vibrant-yellow shadow-[0_0_8px_rgba(253,200,48,0.6)]' : 'bg-white/20'}`} 
                    />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-tighter">Mon — Sun Status</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                <Trophy className="w-6 h-6 text-vibrant-yellow" />
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />
        </div>
      </header>

      {/* Leaderboard */}
      <section className="w-full space-y-4 mb-10">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-vibrant-indigo uppercase tracking-wider">好友排行榜</h2>
            <span className="bg-vibrant-purple/10 text-vibrant-purple text-[10px] px-2 py-0.5 rounded-full font-bold">{MOCK_USERS.length} 人在练</span>
          </div>
          <span className="text-[10px] font-bold text-charcoal/40">LEVEL 99</span>
        </div>
        
        {userStats.map((user, index) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-[28px] p-5 shadow-md border border-white flex items-center gap-4 relative overflow-hidden group active:scale-[0.98] transition-transform"
          >
            <div className="relative flex-shrink-0" onClick={() => !user.isMe && handlePoke(user.name)}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-100 overflow-hidden">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-14 h-14 object-contain"
                />
              </div>
              {index === 0 && (
                <div className="absolute -top-2 -left-2 bg-vibrant-yellow text-white p-1 rounded-lg shadow-sm">
                  <Trophy className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <h3 className="font-black text-base text-vibrant-indigo">{user.name}</h3>
                <span className="text-[10px] font-bold text-charcoal/30">{user.count} DAYS</span>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-bold text-charcoal/40 uppercase tracking-tighter">
                  <span>Weekly Status</span>
                  <span>{Math.round(user.count / 7 * 100)}%</span>
                </div>
                <div className="flex gap-1">
                  {user.dayStatus.map((active, i) => (
                    <div 
                      key={i} 
                      className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden"
                    >
                      {active && (
                        <motion.div 
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="h-full w-full origin-left"
                          style={{
                            background: index === 0 ? 'linear-gradient(90deg, #8E2DE2, #4A00E0)' : 
                                       index === 1 ? 'linear-gradient(90deg, #FF512F, #DD2476)' : 
                                       '#8BA888'
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button for friends */}
            {!user.isMe && (
              <button 
                onClick={() => handlePoke(user.name)}
                className="ml-2 bg-gradient-to-br from-vibrant-orange to-vibrant-pink text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-sm active:scale-90 transition-transform"
              >
                催一催
              </button>
            )}
          </motion.div>
        ))}

        {/* Invite Placeholder */}
        <motion.button 
          onClick={() => setShowInvite(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-6 border-2 border-dashed border-vibrant-purple/20 rounded-[28px] flex flex-col items-center justify-center gap-2 text-vibrant-purple/40 hover:bg-vibrant-purple/5 transition-colors"
        >
          <div className="w-10 h-10 bg-vibrant-purple/10 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 rotate-45" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">邀请更多好友加入</span>
        </motion.button>
      </section>

      {/* Recent Photos */}
      <section className="w-full mb-8">
        <h2 className="text-sm font-black text-vibrant-indigo uppercase tracking-wider mb-4 px-2">本周瞬间</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {checkIns.length === 0 ? (
            <div className="w-full h-40 bg-white/50 backdrop-blur-sm border-2 border-dashed border-vibrant-purple/20 rounded-[32px] flex flex-col items-center justify-center text-vibrant-purple/40">
              <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs font-bold">快来开启第一张照片</p>
            </div>
          ) : (
            checkIns.map((c) => (
              <motion.div 
                key={c.id} 
                whileHover={{ y: -5 }}
                className="flex-shrink-0 relative group"
              >
                <div className="w-32 h-44 bg-white p-2 rounded-[24px] shadow-lg border border-white">
                  <img 
                    src={c.photo} 
                    alt="Check-in" 
                    className="w-full h-full object-cover rounded-[18px]"
                  />
                </div>
                {c.isLate && (
                  <span className="absolute top-4 left-4 bg-vibrant-orange text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-md uppercase">Late</span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 gap-4 max-w-md mx-auto z-40">
        <button 
          onClick={() => {
            setIsLateCheckIn(false);
            fileInputRef.current?.click();
          }}
          className="flex-1 bg-gradient-to-br from-vibrant-purple to-vibrant-indigo text-white py-5 rounded-[24px] font-black shadow-xl shadow-vibrant-purple/30 flex items-center justify-center gap-3 active:scale-95 transition-transform uppercase tracking-wider"
        >
          <Camera className="w-6 h-6" />
          CHECK IN
        </button>
        
        <button 
          onClick={() => {
            setIsLateCheckIn(true);
            fileInputRef.current?.click();
          }}
          className="bg-white text-vibrant-purple w-16 h-16 rounded-[24px] shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-white"
        >
          <Calendar className="w-6 h-6" />
        </button>

        <button 
          onClick={generateReport}
          className="bg-gradient-to-br from-vibrant-orange to-vibrant-pink text-white w-16 h-16 rounded-[24px] shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Camera Preview Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-vibrant-indigo/90 backdrop-blur-xl z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 flex justify-between items-center">
                <h3 className="text-xl font-black text-vibrant-indigo">
                  {isLateCheckIn ? '补签昨日' : '今日打卡'}
                </h3>
                <button onClick={() => setShowCamera(false)} className="p-3 bg-slate-100 rounded-2xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="px-8 pb-8">
                <div className="aspect-[3/4] rounded-[32px] overflow-hidden bg-slate-100 relative shadow-inner border-4 border-slate-50">
                  {previewPhoto && <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />}
                  {isLateCheckIn && (
                    <div className="absolute top-6 left-6 bg-vibrant-orange text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-lg uppercase">
                      Late Tag Added
                    </div>
                  )}
                </div>
                
                <div className="mt-8 flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-5 rounded-[24px] bg-slate-100 font-black text-charcoal/40 uppercase text-xs"
                  >
                    Retake
                  </button>
                  <button 
                    onClick={submitCheckIn}
                    className="flex-[2] bg-gradient-to-br from-vibrant-purple to-vibrant-indigo text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-2 uppercase text-xs shadow-lg shadow-vibrant-purple/20"
                  >
                    <Check className="w-5 h-5" />
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-vibrant-purple/90 backdrop-blur-xl z-[70] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden flex flex-col shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-vibrant-indigo">邀请好友</h3>
                <button onClick={() => setShowInvite(false)} className="p-3 bg-slate-100 rounded-2xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gradient-to-br from-vibrant-purple to-vibrant-indigo p-8 rounded-[40px] text-white text-center mb-8 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-white/20 rounded-[24px] flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                    <Trophy className="w-10 h-10 text-vibrant-yellow" />
                  </div>
                  <h4 className="text-xl font-black mb-2">加入我的汗水战队</h4>
                  <p className="text-white/60 text-xs leading-relaxed">
                    输入房间号或点击链接，<br />开启本周的健身挑战！
                  </p>
                  <div className="mt-8 bg-white/10 backdrop-blur-md py-4 rounded-2xl border border-white/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Room ID</p>
                    <p className="text-3xl font-black tracking-widest">#{roomId}</p>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full" />
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleCopyLink}
                  className="w-full bg-vibrant-indigo text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 uppercase tracking-wider shadow-lg shadow-vibrant-indigo/20"
                >
                  <Share2 className="w-5 h-5" />
                  复制邀请链接
                </button>
                <button 
                  onClick={() => {
                    showToast("已模拟新朋友加入战队！");
                    setShowInvite(false);
                  }}
                  className="w-full bg-slate-100 text-charcoal/40 py-5 rounded-[24px] font-black uppercase tracking-wider text-xs"
                >
                  模拟新朋友加入 (Demo)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-vibrant-purple z-[60] overflow-y-auto p-6 flex flex-col items-center"
          >
            <div className="w-full flex justify-between items-center mb-8">
              <button onClick={() => setShowReport(false)} className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Weekly Power Preview</h3>
              <button onClick={() => showToast("已保存到相册")} className="p-4 bg-vibrant-yellow rounded-2xl text-vibrant-indigo shadow-lg">
                <ImageIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white w-full max-w-xs rounded-[48px] shadow-2xl p-10 flex flex-col items-center border-8 border-white/20">
              <div className="text-center mb-10">
                <p className="text-[10px] text-vibrant-purple font-black uppercase tracking-[0.3em] mb-2">Sweat Weekly</p>
                <h2 className="text-3xl font-black text-vibrant-indigo leading-tight">汗水不负努力</h2>
                <div className="h-1 w-12 bg-vibrant-yellow mx-auto mt-4 rounded-full" />
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mb-10">
                <div className="bg-slate-50 p-5 rounded-[32px] text-center border border-slate-100">
                  <p className="text-[10px] font-black text-charcoal/30 uppercase mb-1">Total</p>
                  <p className="text-2xl font-black text-vibrant-indigo">{userStats.reduce((acc, u) => acc + u.count, 0)}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-[32px] text-center border border-slate-100">
                  <p className="text-[10px] font-black text-charcoal/30 uppercase mb-1">MVP</p>
                  <p className="text-xl font-black text-vibrant-pink">{userStats[0].name}</p>
                </div>
              </div>

              <div className="w-full grid grid-cols-3 gap-3 mb-10">
                {checkIns.slice(0, 6).map((c, i) => (
                  <img key={i} src={c.photo} className="aspect-square object-cover rounded-2xl shadow-sm" alt="Sweat" />
                ))}
                {checkIns.length < 6 && [...Array(6 - checkIns.length)].map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                    <ImageIcon className="w-5 h-5 text-slate-200" />
                  </div>
                ))}
              </div>

              <div className="w-full space-y-4 mb-10">
                {userStats.map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <img src={u.avatar} className="w-8 h-8 rounded-xl bg-slate-50" alt="" />
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-black text-vibrant-indigo mb-1">
                        <span>{u.name}</span>
                        <span>{u.count}D</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-vibrant-purple rounded-full" 
                          style={{ width: `${u.count / 7 * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-slate-100 w-full pt-8 text-center">
                <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-widest">Generated by Sweat Weekly</p>
                <div className="mt-6 flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-vibrant-purple to-vibrant-indigo rounded-[20px] flex items-center justify-center shadow-lg">
                    <Trophy className="w-8 h-8 text-vibrant-yellow" />
                  </div>
                </div>
              </div>
            </div>
            
            <p className="mt-10 text-white/60 text-[10px] font-black text-center px-12 leading-relaxed uppercase tracking-widest">
              Long press to save <br /> share your power
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white text-vibrant-indigo px-8 py-4 rounded-[24px] text-xs font-black shadow-2xl z-[100] whitespace-nowrap flex items-center gap-3 border border-white"
          >
            <div className="w-2 h-2 bg-vibrant-pink rounded-full animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
