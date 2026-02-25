'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaScroll, FaTimes, FaSpinner, FaCheckCircle, FaCoins, FaStar } from 'react-icons/fa'
import { GiLockedChest, GiOpenTreasureChest } from 'react-icons/gi'
import { getUserQuests, claimQuestReward } from '@/app/actions'
import { toast } from 'react-toastify'

type Quest = {
  id: string; title: string; description: string; quest_type: string;
  target_amount: number; reward_coins: number;
  progress: number; is_completed: boolean; is_claimed: boolean; progress_id: string | null;
}

export default function QuestsModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(false)
  
  const [chestAnim, setChestAnim] = useState<{ id: string, state: 'shaking' | 'opened' } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getUserQuests().then(res => {
        if (res.quests) setQuests(res.quests)
        setLoading(false)
      })
    }
  }, [isOpen])

  const handleClaim = async (progressId: string, reward: number) => {
    setChestAnim({ id: progressId, state: 'shaking' })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const res = await claimQuestReward(progressId, reward)
    
    if (res.success) {
      setChestAnim({ id: progressId, state: 'opened' })
      toast.success(`+${reward} Nexus Coins recebidas!`, { theme: 'dark', icon: <FaCoins className="text-yellow-500" /> })
      
      setQuests(prev => prev.map(q => q.progress_id === progressId ? { ...q, is_claimed: true } : q))
      
      setTimeout(() => setChestAnim(null), 2000)
    } else {
      setChestAnim(null)
      toast.error(res.error, { theme: 'dark' })
    }
  }

  // Cálculos para a Barra de Progresso Global Diária
  const dailyQuests = quests.filter(q => q.quest_type === 'DAILY');
  const completedDailies = dailyQuests.filter(q => q.is_completed).length;
  const totalDailies = dailyQuests.length || 3; // Fallback para 3
  const dailyPct = Math.min((completedDailies / totalDailies) * 100, 100);

  const renderQuestCard = (quest: Quest) => {
    const isAnimatingThis = chestAnim?.id === quest.progress_id;
    const isShaking = isAnimatingThis && chestAnim.state === 'shaking';
    const isOpened = isAnimatingThis && chestAnim.state === 'opened';
    const pct = Math.min((quest.progress / quest.target_amount) * 100, 100);

    return (
      <div key={quest.id} className="bg-background/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-inner relative overflow-hidden">
        {quest.is_completed && !quest.is_claimed && (
          <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent pointer-events-none"></div>
        )}

        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-black text-white text-sm truncate">{quest.title}</h4>
            <span className="flex items-center gap-1 text-[9px] font-black bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30">
              +{quest.reward_coins} <FaCoins />
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate mb-3">{quest.description}</p>
          
          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
            <div className={`h-full transition-all duration-1000 ${quest.is_completed ? 'bg-primary' : 'bg-gray-500'}`} style={{ width: `${pct}%` }}></div>
          </div>
          <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-widest">{quest.progress} / {quest.target_amount}</p>
        </div>

        <div className="shrink-0 flex flex-col items-center justify-center w-20 z-10">
          {quest.is_claimed ? (
            <div className="flex flex-col items-center text-gray-500 opacity-50">
              <FaCheckCircle className="text-2xl mb-1" />
              <span className="text-[9px] font-black uppercase mt-1">Concluído</span>
            </div>
          ) : quest.is_completed ? (
            <button 
              onClick={() => quest.progress_id && handleClaim(quest.progress_id, quest.reward_coins)}
              disabled={isAnimatingThis}
              className="flex flex-col items-center text-yellow-400 hover:text-yellow-300 hover:scale-110 transition-transform disabled:pointer-events-none group"
            >
              <div className="relative">
                {isOpened ? (
                  <GiOpenTreasureChest className="text-4xl drop-shadow-[0_0_15px_rgba(234,179,8,1)] animate-in zoom-in" />
                ) : (
                  <GiLockedChest className={`text-4xl drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] ${isShaking ? 'animate-bounce' : 'group-hover:animate-pulse'}`} />
                )}
                {isOpened && <FaStar className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg animate-ping text-yellow-300" />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest mt-1 bg-yellow-500 text-black px-2 py-0.5 rounded shadow-lg ${isShaking ? 'opacity-0' : 'opacity-100'}`}>
                Resgatar
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center text-gray-600">
              <GiLockedChest className="text-3xl mb-1 opacity-40" />
              <span className="text-[9px] font-black uppercase tracking-widest">{pct}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const modalContent = (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !chestAnim && setIsOpen(false)}></div>
      
      <div className="bg-surface border border-white/10 p-6 rounded-4xl w-full max-w-lg relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xl border border-primary/30 shadow-inner">
              <FaScroll />
            </div>
            <div>
              <h3 className="text-xl font-black text-white leading-tight">Contratos do Nexus</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ganhe moedas diariamente</p>
            </div>
          </div>
          <button onClick={() => !chestAnim && setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors bg-background p-2 rounded-full border border-white/5"><FaTimes /></button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-primary">
            <FaSpinner className="animate-spin text-4xl mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Procurando Contratos...</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            
            <div className="bg-background/50 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Progresso Diário</span>
                <span className="text-xs font-black text-primary">{completedDailies} / {totalDailies}</span>
              </div>
              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div className="h-full transition-all duration-1000 bg-linear-to-r from-primary to-blue-400 relative" style={{ width: `${dailyPct}%` }}>
                   {dailyPct === 100 && <div className="absolute inset-0 bg-white/30 animate-pulse"></div>}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span> Diárias
              </h4>
              <div className="space-y-3">
                {dailyQuests.map(renderQuestCard)}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Semanais
              </h4>
              <div className="space-y-3">
                {quests.filter(q => q.quest_type === 'WEEKLY').map(renderQuestCard)}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-xl bg-surface border border-white/5 text-gray-400 hover:text-primary hover:border-primary/50 transition-all flex items-center justify-center text-lg relative"
        title="Quests e Contratos"
      >
        <FaScroll />
        {quests.some(q => q.is_completed && !q.is_claimed) && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
        )}
      </button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  )
}