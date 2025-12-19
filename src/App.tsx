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
  Loader2,
  Stethoscope,
  Filter,
  UserPlus
} from 'lucide-react';

// Tipagens
interface Professional {
  id: string;
  name: string;
}

interface Patient {
  id: number;
  name: string;
  parent: string;
  birthDate: string;
  lastCheckin: string | null;
  nextCheckin: string | null;
  professionalId: string; // Vínculo com a Dra
}

const App: React.FC = () => {
  // Estados da aplicação
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfessional, setFilterProfessional] = useState<string>('all');
  
  // Estados de Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  
  const [checkinTargetId, setCheckinTargetId] = useState<number | null>(null);
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLibLoading, setIsLibLoading] = useState(true);

  // Injeção de dependências e fontes
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setIsLibLoading(false);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(fontLink);
    };
  }, []);

  // Carregar dados
  useEffect(() => {
    const savedPatients = localStorage.getItem('pueri_patients_v6');
    const savedProfs = localStorage.getItem('pueri_profs_v6');
    
    if (savedPatients) setPatients(JSON.parse(savedPatients));
    if (savedProfs) {
      setProfessionals(JSON.parse(savedProfs));
    } else {
      setProfessionals([]);
    }
  }, []);

  // Salvar dados
  useEffect(() => {
    localStorage.setItem('pueri_patients_v6', JSON.stringify(patients));
    localStorage.setItem('pueri_profs_v6', JSON.stringify(professionals));
  }, [patients, professionals]);

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
    if (months < 0) { years--; months += 12; }

    const totalMonths = (years * 12) + months;
    let frequency = "Anual";
    if (totalMonths < 12) frequency = "Mensal";
    else if (totalMonths < 24) frequency = "Trimestral";

    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const alertIA = (diffDays >= 175 && totalMonths < 7);

    return { totalMonths, frequency, alertIA, displayAge: years > 0 ? `${years}a ${months}m` : `${months}m ${days}d` };
  };

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const profId = formData.get('professionalId') as string;

    if (!profId) {
      alert("Por favor, selecione ou cadastre uma doutora primeiro.");
      return;
    }

    const newPatient: Patient = {
      id: Date.now(),
      name: formData.get('name') as string,
      parent: formData.get('parent') as string,
      birthDate: formData.get('birthDate') as string,
      professionalId: profId,
      lastCheckin: null,
      nextCheckin: null
    };
    setPatients([...patients, newPatient]);
    setIsAddModalOpen(false);
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !(window as any).XLSX) return;
    
    if (professionals.length === 0) {
      alert("Cadastre pelo menos uma doutora antes de importar pacientes.");
      return;
    }

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

        // Tenta encontrar uma Dra pelo nome na planilha, senão usa a primeira cadastrada
        const profNameInExcel = row['Dra'] || row['Médica'] || row['Profissional'];
        const matchedProf = professionals.find(p => p.name.toLowerCase().includes(String(profNameInExcel).toLowerCase()));
        const profId = matchedProf ? matchedProf.id : professionals[0].id;

        return {
          id: Date.now() + index + Math.random(),
          name: String(row['Nome'] || row['Paciente'] || ""),
          parent: String(row['Responsável'] || row['Pai/Mãe'] || "N/A"),
          birthDate: String(bDate),
          professionalId: profId,
          lastCheckin: null,
          nextCheckin: null
        };
      }).filter(p => p.name && p.birthDate);

      setPatients(prev => [...prev, ...newPatients]);
      alert(`${newPatients.length} pacientes importados com sucesso!`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleAddProfessional = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('profName') as string;
    if (name) {
      setProfessionals([...professionals, { id: String(Date.now()), name }]);
      e.currentTarget.reset();
    }
  };

  const removeProfessional = (id: string) => {
    if (patients.some(p => p.professionalId === id)) {
      alert("Não é possível remover: esta profissional possui pacientes vinculados.");
      return;
    }
    setProfessionals(professionals.filter(p => p.id !== id));
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

        return { ...p, lastCheckin: checkinDate, nextCheckin: nextDate.toISOString().split('T')[0] };
      }
      return p;
    });
    setPatients(updatedPatients);
    setIsCheckinModalOpen(false);
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.parent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProf = filterProfessional === 'all' || p.professionalId === filterProfessional;
    return matchesSearch && matchesProf;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-700" style={{ fontFamily: "'Open Sans', sans-serif" }}>
      <style>{`body { font-family: 'Open Sans', sans-serif; }`}</style>

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">Puericultura Digital</h1>
            <p className="text-blue-500 font-medium">Gestão Multiprofissional</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsProfModalOpen(true)}
              className="bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <Stethoscope size={18} />
              Doutoras
            </button>
            <label className={`cursor-pointer bg-white text-blue-600 border border-blue-100 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-sm ${isLibLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isLibLoading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
              Importar Excel
              {!isLibLoading && <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={importExcel} />}
            </label>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              <Plus size={18} />
              Novo Paciente
            </button>
          </div>
        </header>

        {/* Filtros e Busca */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
           <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3.5 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-blue-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm bg-white"
              />
           </div>
           <div className="relative">
              <Filter className="absolute left-3 top-3.5 text-blue-400" size={18} />
              <select 
                value={filterProfessional}
                onChange={(e) => setFilterProfessional(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-blue-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm bg-white appearance-none font-bold text-blue-900"
              >
                <option value="all">Todas as Doutoras</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.id}>{prof.name}</option>
                ))}
              </select>
           </div>
           <div className="bg-blue-900 text-white rounded-2xl p-3 flex items-center justify-center gap-3 shadow-lg shadow-blue-100">
              <Users size={20} className="text-blue-300" />
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60 leading-none">Resultados</p>
                <p className="text-xl font-black">{filteredPatients.length}</p>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-blue-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-blue-50/50 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Dra. Responsável</th>
                  <th className="px-6 py-4">Idade</th>
                  <th className="px-6 py-4">Próxima Visita</th>
                  <th className="px-6 py-4">Alertas</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {filteredPatients.map(p => {
                  const age = calculateAgeInfo(p.birthDate);
                  const prof = professionals.find(pr => pr.id === p.professionalId);
                  
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <p className="font-bold text-blue-900 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-blue-300 font-bold uppercase">Resp: {p.parent}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          {prof?.name || 'Não atribuída'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{age.displayAge}</span>
                      </td>
                      <td className="px-6 py-5">
                        <p className={`text-sm font-black ${p.nextCheckin ? 'text-blue-600' : 'text-slate-300'}`}>
                          {p.nextCheckin ? new Date(p.nextCheckin + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        {age.alertIA && (
                          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black border border-orange-100">
                            <AlertCircle size={12} /> IA EM BREVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => { setCheckinTargetId(p.id); setIsCheckinModalOpen(true); }}
                            className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all"
                          >
                            CHECK-IN
                          </button>
                          <button onClick={() => setPatients(patients.filter(pat => pat.id !== p.id))} className="text-slate-200 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPatients.length === 0 && (
              <div className="p-16 text-center text-slate-300">
                <Users className="mx-auto mb-4 opacity-20" size={64} />
                <p className="font-medium">Nenhum paciente encontrado para este filtro.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Paciente */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-blue-900">Novo Cadastro</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="text-slate-300" /></button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Paciente</label>
                <input name="name" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Responsável</label>
                <input name="parent" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Nascimento</label>
                  <input type="date" name="birthDate" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-900 uppercase ml-1">Doutora</label>
                  {professionals.length > 0 ? (
                    <select name="professionalId" required className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none font-bold text-blue-900">
                      {professionals.map(prof => (
                        <option key={prof.id} value={prof.id}>{prof.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[10px] text-red-500 font-bold p-2 bg-red-50 rounded-lg">
                      Cadastre uma doutora primeiro!
                    </div>
                  )}
                </div>
              </div>
              <button 
                type="submit" 
                disabled={professionals.length === 0}
                className={`w-full font-black py-4 rounded-xl mt-2 transition-all ${
                  professionals.length === 0 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                }`}
              >
                Salvar Paciente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestão de Profissionais */}
      {isProfModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-blue-900">Doutoras</h3>
              <button onClick={() => setIsProfModalOpen(false)}><X className="text-slate-300" /></button>
            </div>
            
            <form onSubmit={handleAddProfessional} className="flex gap-2 mb-6">
              <input name="profName" placeholder="Nome da Dra..." required className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" />
              <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700">
                <Plus size={24} />
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {professionals.map(prof => (
                <div key={prof.id} className="flex justify-between items-center p-4 bg-blue-50/30 rounded-xl border border-blue-50">
                  <span className="font-bold text-blue-900">{prof.name}</span>
                  <button onClick={() => removeProfessional(prof.id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {professionals.length === 0 && (
                <p className="text-center text-slate-400 py-4 text-sm italic">Nenhuma doutora cadastrada.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Check-in */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
             <Calendar size={32} className="mx-auto mb-4 text-green-500" />
             <h3 className="text-xl font-black text-blue-900 mb-6">Data da Consulta</h3>
             <input 
               type="date" 
               value={checkinDate} 
               onChange={e => setCheckinDate(e.target.value)}
               className="w-full p-4 bg-slate-50 border rounded-xl text-center font-black mb-6"
             />
             <div className="flex gap-3">
               <button onClick={() => setIsCheckinModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400">Cancelar</button>
               <button onClick={confirmCheckin} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black">Confirmar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
// build