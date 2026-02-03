import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/start'
import { useState } from 'react'
import { getEvent } from 'vinxi/http'
import { 
  Thermometer, Droplets, Utensils, Plus, 
  ChevronLeft, Calendar, Mars, Venus, HelpCircle,
  Lock, Save, X, Trash2
} from 'lucide-react'

// --- 1. 后端数据库函数 (Server Functions) ---

const getDB = () => {
  const { context } = getEvent()
  return context.cloudflare.env.DB as D1Database
}

/** 获取所有守宫及其关联日志 */
export const getGeckosFn = createServerFn('GET', async () => {
  const db = getDB()
  const { results: geckos } = await db.prepare('SELECT * FROM geckos ORDER BY id DESC').all()
  
  const enrichedGeckos = await Promise.all(geckos.map(async (gecko: any) => {
    const { results: logs } = await db
      .prepare('SELECT * FROM logs WHERE gecko_id = ? ORDER BY id DESC LIMIT 20')
      .bind(gecko.id)
      .all()
    return { ...gecko, logs }
  }))
  return enrichedGeckos
})

/** 创建新守宫成员 */
export const createGeckoFn = createServerFn('POST', async (payload: { name: string, morph: string, gender: string }) => {
  const db = getDB()
  const defaultImg = `https://picsum.photos/seed/${Math.random()}/400/400`
  await db.prepare('INSERT INTO geckos (name, morph, gender, image) VALUES (?, ?, ?, ?)')
    .bind(payload.name, payload.morph, payload.gender, defaultImg)
    .run()
  return { success: true }
})

/** 添加成长日记 */
export const addLogFn = createServerFn('POST', async (payload: { geckoId: number, temp: string, humidity: string, food: string, notes: string }) => {
  const db = getDB()
  const date = new Date().toLocaleDateString('zh-CN')
  await db.prepare('INSERT INTO logs (gecko_id, log_date, temp, humidity, food, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(payload.geckoId, date, payload.temp, payload.humidity, payload.food, payload.notes)
    .run()
  return { success: true }
})

// --- 2. 路由注册与 Loader ---

export const Route = createFileRoute('/Logbook')({
  loader: () => getGeckosFn(),
  component: LogbookPage,
})

// --- 3. 页面组件 ---

function LogbookPage() {
  const geckos = Route.useLoaderData()
  const router = useRouter()
  const [selectedGeckoId, setSelectedGeckoId] = useState<number | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  const selectedGecko = geckos.find((g: any) => g.id === selectedGeckoId)

  // 性别图标逻辑
  const renderGenderIcon = (gender: string) => {
    switch(gender) {
      case 'Male': return <Mars size={14} className="text-blue-500" />
      case 'Female': return <Venus size={14} className="text-pink-500" />
      default: return <HelpCircle size={14} className="text-gray-400" />
    }
  }

  // 快捷添加日志逻辑
  const handleQuickLog = async (geckoId: number) => {
    await addLogFn({
      geckoId,
      temp: '26℃',
      humidity: '75%',
      food: 'Pangea 混合果泥',
      notes: '日常记录：状态良好'
    })
    router.invalidate() // 刷新页面数据
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in">
      {/* 头部区域 */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          {selectedGeckoId ? (
            <button onClick={() => setSelectedGeckoId(null)} className="flex items-center gap-2 text-amber-800 font-bold text-sm uppercase tracking-widest mb-4 hover:opacity-70">
              <ChevronLeft size={16} /> 返回列表
            </button>
          ) : (
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-widest">
              <Lock size={12} /> D1 云端加密记录
            </div>
          )}
          <h1 className="text-4xl font-bold text-moss-dark serif">
            {selectedGeckoId ? selectedGecko?.name : `睫角玩家的个人爬房`}
          </h1>
        </div>
        {!selectedGeckoId && (
          <button onClick={() => setIsAddModalOpen(true)} className="bg-moss-dark text-white px-8 py-4 rounded-global font-bold flex items-center gap-3 shadow-xl hover:bg-green-800 transition-all">
            <Plus size={20} /> 添加成员
          </button>
        )}
      </div>

      {!selectedGeckoId ? (
        /* 守宫列表 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {geckos.map((gecko: any) => (
            <div key={gecko.id} onClick={() => setSelectedGeckoId(gecko.id)} className="group bg-white rounded-global border border-green-900/10 shadow-sm hover:shadow-2xl transition-all cursor-pointer overflow-hidden">
              <div className="aspect-video relative overflow-hidden bg-amber-50">
                <img src={gecko.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-sm">{renderGenderIcon(gecko.gender)}</div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-moss-dark serif">{gecko.name}</h3>
                <p className="text-xs text-amber-700 font-bold uppercase tracking-widest">{gecko.morph}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 详情与成长日记 */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-global border border-green-900/20 shadow-sm space-y-6">
              <img src={selectedGecko?.image} className="w-full aspect-square rounded-global object-cover shadow-inner" alt="" />
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-moss-dark serif">{selectedGecko?.name}</h2>
                <div className="inline-block text-xs font-bold text-green-800 bg-amber-50 px-4 py-1 rounded-full uppercase">
                  {selectedGecko?.morph}
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 space-y-8">
            <div className="flex justify-between items-center border-b border-green-900/10 pb-4">
              <h3 className="text-xl font-bold text-moss-dark serif">成长日记</h3>
              <button onClick={() => handleQuickLog(selectedGecko.id)} className="bg-amber-800 text-white px-6 py-2 rounded-global text-[11px] font-bold uppercase tracking-widest hover:bg-amber-900">
                + 记录今日状态
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedGecko?.logs.map((log: any) => (
                <div key={log.id} className="bg-white p-6 rounded-global border border-green-900/10 shadow-sm hover:border-green-900/30 transition-colors">
                  <div className="flex justify-between mb-4">
                    <div className="text-xs font-mono font-bold text-amber-800 flex items-center gap-1">
                      <Calendar size={12} /> {log.log_date}
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-green-700">
                      <span className="flex items-center gap-1"><Thermometer size={12} /> {log.temp}</span>
                      <span className="flex items-center gap-1"><Droplets size={12} /> {log.humidity}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <Utensils size={14} className="text-amber-600 mt-1" />
                    <p className="text-sm font-bold text-moss-dark">喂食：{log.food}</p>
                  </div>
                  <p className="text-xs text-green-900/70 italic border-l-2 border-amber-800/20 pl-4 py-1">“{log.notes}”</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 添加守宫 Modal */}
      {isAddModalOpen && (
        <AddGeckoModal onClose={() => setIsAddModalOpen(false)} onRefresh={() => router.invalidate()} />
      )}
    </div>
  )
}

/** 内部弹窗组件 */
function AddGeckoModal({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) {
  const [name, setName] = useState('')
  const [morph, setMorph] = useState('莉莉白')
  const [gender, setGender] = useState('Female')

  const handleSave = async () => {
    if(!name) return
    await createGeckoFn({ name, morph, gender })
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        <h2 className="text-2xl font-bold text-moss-dark mb-6 serif">登记新成员</h2>
        <div className="space-y-4">
          <input placeholder="守宫昵称" className="w-full p-4 bg-amber-50 rounded-xl outline-none border border-transparent focus:border-amber-200" value={name} onChange={e => setName(e.target.value)} />
          <select className="w-full p-4 bg-amber-50 rounded-xl outline-none" value={morph} onChange={e => setMorph(e.target.value)}>
            <option>莉莉白 (Lilly White)</option>
            <option>超级大麦町</option>
            <option>火团/双色</option>
          </select>
          <div className="flex gap-4">
            {['Male', 'Female', 'Unknown'].map(g => (
              <button key={g} onClick={() => setGender(g)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${gender === g ? 'bg-moss-dark text-white' : 'bg-white text-gray-400 border-gray-100'}`}>
                {g === 'Male' ? '雄性' : g === 'Female' ? '雌性' : '未知'}
              </button>
            ))}
          </div>
          <button onClick={handleSave} className="w-full bg-moss-dark text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">
            <Save size={18} /> 存入云端
          </button>
        </div>
      </div>
    </div>
  )
}