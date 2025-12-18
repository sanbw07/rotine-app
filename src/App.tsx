import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  FileUp, 
  Search, 
  CheckCircle, 
  Trash2, 
  X, 
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Definição do tipo do Paciente
interface Patient {
  id: number;
  name: string;
  parent: string;
  birthDate: string;
  lastCheckin: string | null;
  nextCheckin: string | null;
}

const App: React.FC = () => {
  // Estados da aplicação
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [checkinTargetId, setCheckinTargetId] = useState<number | null>(null);
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLibLoading, setIsLibLoading] = useState(true);

  // Carregar a biblioteca XLSX dinamicamente e injetar fonte Inter
  useEffect(() => {
    // Injetar Link da Fonte Inter
    const fontLink = document.createElement('link');
    fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    // Injetar Biblioteca XLSX
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => {
      setIsLibLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(fontLink);
    };
  }, []);

  // Carregar dados iniciais do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pueri_patients_v5');
    if (saved) {
      setPatients(JSON.parse(saved));
    }
  }, []);

  // Salvar no localStorage sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem('pueri_patients_v5', JSON.stringify(patients));
  }, [patients]);

  // Função para calcular idade e alertas
  const calculateAgeInfo = (birthDate: string) => {
    if (!birthDate) return { displayAge: '---', frequency: '---', alertIA: false };
    
    const birth = new Date(birthDate + 'T12:00:00');
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMonths = (years * 12) + months;
    let frequency = "Anual";
    if (totalMonths < 12) frequency = "Mensal";
    else if (totalMonths < 24) frequency = "Trimestral";

    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const alertIA = (diffDays >= 175 && totalMonths < 7);

    return {
      totalMonths,
      frequency,
      alertIA,
      displayAge: years > 0 ? `${years}a ${months}m` : `${months}m ${days}d`
    };
  };

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPatient: Patient = {
      id: Date.now(),
      name: formData.get('name') as string,
      parent: formData.get('parent') as string,
      birthDate: formData.get('birthDate') as string,
      lastCheckin: null,
      nextCheckin: null
    };
    setPatients([...patients, newPatient]);
    setIsAddModalOpen(false);
  };

  const openCheckinModal = (id: number) => {
    setCheckinTargetId(id);
    setCheckinDate(new Date().toISOString().split('T')[0]);
    setIsCheckinModalOpen(true);
  };

  const confirmCheckin = () => {
    if (checkinTargetId === null) return;

    const updatedPatients = patients.map(p => {
      if (p.id === checkinTargetId) {
        const visitDate = new Date(checkinDate + 'T12:00:00');
        const ageInfo = calculateAgeInfo(p.birthDate);
        
        let nextDate = new Date(visitDate);
        if (ageInfo.frequency === "Mensal") nextDate.setMonth(visitDate.getMonth() + 1);
        else if (ageInfo.frequency === "Trimestral") nextDate.setMonth(visitDate.getMonth() + 3);
        else nextDate.setFullYear(visitDate.getFullYear() + 1);

        return {
          ...p,
          lastCheckin: checkinDate,
          nextCheckin: nextDate.toISOString().split('T')[0]
        };
      }
      return p;
    });

    setPatients(updatedPatients);
    setIsCheckinModalOpen(false);
  };

  const removePatient = (id: number) => {
    if (window.confirm("Deseja remover este registro?")) {
      setPatients(patients.filter(p => p.id !== id));
    }
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !(window as any).XLSX) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      if (!bstr) return;
      
      const XLSX = (window as any).XLSX;
      const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newPatients: Patient[] = data.map((row, index) => {
        let bDate = row['Data de Nascimento'] || row['Nascimento'] || row['birthDate'];
        if (bDate instanceof Date) {
          bDate = bDate.toISOString().split('T')[0];
        }
        return {
          id: Date.now() + index + Math.random(),
          name: String(row['Nome'] || row['Paciente'] || ""),
          parent: String(row['Responsável'] || row['Pai/Mãe'] || "N/A"),
          birthDate: String(bDate),
          lastCheckin: null,
          nextCheckin: null
        };
      }).filter(p => p.name && p.birthDate);

      setPatients(prev => [...prev, ...newPatients]);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.parent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const iaAlertCount = patients.filter(p => calculateAgeInfo(p.birthDate).alertIA).length;
  const monthAppointments = patients.filter(p => {
    if (!p.nextCheckin) return false;
    const d = new Date(p.nextCheckin + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-700" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Estilo Global para garantir consistência */}
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        input, button, select, textarea { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">Puericultura Digital</h1>
            <p className="text-blue-500 font-medium">Controle de consultas pediátricas</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <label className={`flex-1 md:flex-none cursor-pointer bg-white text-blue-600 border border-blue-100 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm ${isLibLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isLibLoading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
              Importar Excel
              {!isLibLoading && <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={importExcel} />}
            </label>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              <Plus size={18} />
              Novo Paciente
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Total de Pacientes</p>
            <p className="text-3xl font-black text-blue-900">{patients.length}</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-100">
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Introdução Alimentar</p>
            <p className="text-3xl font-black">{iaAlertCount} em alerta</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Consultas este Mês</p>
            <p className="text-3xl font-black text-blue-900">{monthAppointments}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-blue-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-blue-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-blue-50/20">
            <h2 className="text-xl font-bold text-blue-900">Acompanhamento</h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-3 text-blue-200" size={18} />
              <input 
                type="text" 
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blue-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-blue-50/50 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Idade</th>
                  <th className="px-6 py-4">Regime</th>
                  <th className="px-6 py-4">Próxima Visita</th>
                  <th className="px-6 py-4">Alertas</th>
                  <th className="px-6 py-4 text-center">Presença</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {filteredPatients.map(p => {
                  const age = calculateAgeInfo(p.birthDate);
                  const lastVisit = p.lastCheckin ? new Date(p.lastCheckin + 'T12:00:00') : null;
                  const isDoneThisMonth = lastVisit && lastVisit.getMonth() === currentMonth && lastVisit.getFullYear() === currentYear;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => openCheckinModal(p.id)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDoneThisMonth ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300 hover:bg-blue-100 hover:text-blue-500'}`}
                          >
                            <CheckCircle size={20} />
                          </button>
                          <div>
                            <p className="font-bold text-blue-900 leading-tight">{p.name}</p>
                            <p className="text-[10px] text-blue-300 font-bold uppercase">Resp: {p.parent}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{age.displayAge}</span>
                      </td>
                      <td className="px-6 py-5 text-[10px] font-black uppercase text-blue-400">
                        {age.frequency}
                      </td>
                      <td className="px-6 py-5">
                        <p className={`text-sm font-black ${p.nextCheckin ? 'text-blue-600' : 'text-slate-300'}`}>
                          {p.nextCheckin ? new Date(p.nextCheckin + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        {age.alertIA && (
                          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black border border-orange-100">
                            <AlertCircle size={12} /> IA EM BREVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => openCheckinModal(p.id)}
                          className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all"
                        >
                          CHECK-IN
                        </button>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button onClick={() => removePatient(p.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPatients.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <Users className="mx-auto mb-2 opacity-20" size={48} />
                <p>Nenhum paciente encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionar */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-blue-900">Novo Cadastro</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="text-slate-300" /></button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Nome da Criança</label>
                <input name="name" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Nome do Responsável</label>
                <input name="parent" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Data de Nascimento</label>
                <input type="date" name="birthDate" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 mt-2 hover:bg-blue-700">Finalizar</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Check-in */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-black text-blue-900 mb-2">Data da Consulta</h3>
            <p className="text-xs text-slate-400 mb-6">Informe quando o paciente veio.</p>
            <input 
              type="date" 
              value={checkinDate}
              onChange={(e) => setCheckinDate(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border border-blue-100 rounded-xl text-center font-black text-blue-900 text-lg outline-none mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setIsCheckinModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-500">Voltar</button>
              <button onClick={confirmCheckin} className="flex-1 bg-blue-600 py-3 rounded-xl font-black text-white shadow-lg shadow-blue-100">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;