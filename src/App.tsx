import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  UploadSimple,
  MagnifyingGlass,
  Trash,
  X,
  CalendarBlank,
  WarningCircle,
  Spinner,
  Stethoscope,
  Funnel,
  Baby,
  CheckCircle,
  CheckSquare,
  Square,
  Phone,
  Pencil,
  Copy,
  Check,
} from '@phosphor-icons/react';

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
  phone?: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const App: React.FC = () => {
  // Estados da aplicação
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfessional, setFilterProfessional] = useState<string>('all');
  const [filterCheckin, setFilterCheckin] = useState<string>('all');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Estados de Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedPatientPhone, setSelectedPatientPhone] = useState<{ name: string, phone: string } | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<number[]>([]);
  const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);

  // Estados para geração de mensagem
  const [selectedPatientForMessage, setSelectedPatientForMessage] = useState<Patient | null>(null);
  const [selectedDateForMessage, setSelectedDateForMessage] = useState('');
  const [selectedTimeForMessage, setSelectedTimeForMessage] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isMessageCopied, setIsMessageCopied] = useState(false);

  const [checkinTargetId, setCheckinTargetId] = useState<number | null>(null);
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkinTime, setCheckinTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [isLibLoading, setIsLibLoading] = useState(true);

  // Injeção de dependências e fontes   
  useEffect(() => {
    setCheckinTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setSelectedDateForMessage(new Date().toISOString().split('T')[0]);
    setSelectedTimeForMessage(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setIsLibLoading(false);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Carregar dados
  useEffect(() => {
    const savedPatients = localStorage.getItem('pueri_patients_v6');
    const savedProfs = localStorage.getItem('pueri_profs_v6');
    const savedTodos = localStorage.getItem('pueri_todos_v1');

    if (savedPatients) setPatients(JSON.parse(savedPatients));
    if (savedTodos) setTodos(JSON.parse(savedTodos));
    if (savedProfs) {
      setProfessionals(JSON.parse(savedProfs));
    }

    setTimeout(() => setIsLibLoading(false), 1000);
  }, []);

  // Efeito para salvar dados quando mudam
  useEffect(() => {
    localStorage.setItem('pueri_patients_v6', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('pueri_profs_v6', JSON.stringify(professionals));
  }, [professionals]);

  useEffect(() => {
    localStorage.setItem('pueri_todos_v1', JSON.stringify(todos));
  }, [todos]);

  // Efeito para atualizar data/hora quando selecionar paciente
  useEffect(() => {
    if (selectedPatientForMessage && selectedPatientForMessage.lastCheckin) {
      // Extrai data e hora do último check-in
      const lastCheckin = selectedPatientForMessage.lastCheckin;
      if (lastCheckin.includes('T')) {
        const [datePart, timePart] = lastCheckin.split('T');
        setSelectedDateForMessage(datePart);

        // Extrai apenas hora:minuto
        const time = timePart.substring(0, 5);
        setSelectedTimeForMessage(time);
      } else {
        // Se não tiver hora, usa apenas a data
        setSelectedDateForMessage(lastCheckin.split('T')[0]);
        setSelectedTimeForMessage('09:00'); // Hora padrão
      }
    } else if (selectedPatientForMessage && selectedPatientForMessage.nextCheckin) {
      // Se não tiver check-in mas tiver próxima consulta agendada
      setSelectedDateForMessage(selectedPatientForMessage.nextCheckin);
      setSelectedTimeForMessage('09:00'); // Hora padrão
    }
  }, [selectedPatientForMessage]);

  const calculateAgeInfo = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);

    birth.setMinutes(birth.getMinutes() + birth.getTimezoneOffset());

    let ageMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) {
      ageMonths--;
    }

    const lastMonthDate = new Date(birth);
    lastMonthDate.setMonth(lastMonthDate.getMonth() + ageMonths);

    const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lastMonthNoTime = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), lastMonthDate.getDate());

    const diffTime = Math.abs(todayNoTime.getTime() - lastMonthNoTime.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { months: ageMonths, days };
  };

  // Função para abrir modal de edição
  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setIsEditModalOpen(true);
  };

  // Função para salvar edição
  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;

    const formData = new FormData(e.currentTarget);
    const updatedPatient: Patient = {
      ...editingPatient,
      name: formData.get('editName') as string,
      parent: formData.get('editParent') as string,
      birthDate: formData.get('editBirthDate') as string,
      phone: formData.get('editPhone') as string || '',
      professionalId: formData.get('editProfessionalId') as string,
    };

    setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    setIsEditModalOpen(false);
    setEditingPatient(null);
  };

  // Função para gerar mensagem de confirmação
  const generateConfirmationMessage = () => {
    if (!selectedPatientForMessage) {
      alert("Por favor, selecione um paciente primeiro.");
      return;
    }

    const professional = professionals.find(p => p.id === selectedPatientForMessage.professionalId);
    const doctorName = professional ? professional.name : 'Dra. Responsável';

    // Verifica se o paciente tem check-in agendado
    if (!selectedPatientForMessage.lastCheckin && !selectedPatientForMessage.nextCheckin) {
      alert("Este paciente ainda não tem consulta agendada. Faça um check-in primeiro.");
      return;
    }

    // Formatar data
    const dateObj = new Date(selectedDateForMessage);
    const formattedDate = dateObj.toLocaleDateString('pt-BR');

    // Formatar hora
    const formattedTime = selectedTimeForMessage;

    const message = `Olá ${selectedPatientForMessage.parent}! Tudo bem? 😊

Posso confirmar a consulta do(a) ${selectedPatientForMessage.name} no dia ${formattedDate} às ${formattedTime} com a ${doctorName}?

Ficamos à disposição para qualquer dúvida!
    
Atenciosamente,
Equipe Espaço da Ped`;

    setGeneratedMessage(message);
  };

  // Função para copiar mensagem
  const copyToClipboard = () => {
    if (!generatedMessage) return;

    navigator.clipboard.writeText(generatedMessage)
      .then(() => {
        setIsMessageCopied(true);
        setTimeout(() => setIsMessageCopied(false), 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar: ', err);
        alert('Erro ao copiar mensagem.');
      });
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
      nextCheckin: null,
      phone: formData.get('phone') as string
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

        const profNameInExcel = row['Dra'] || row['Médica'] || row['Profissional'];
        const matchedProf = professionals.find(p => p.name.toLowerCase().includes(String(profNameInExcel).toLowerCase()));
        const profId = matchedProf ? matchedProf.id : professionals[0].id;

        return {
          id: Date.now() + index,
          name: String(row['Nome'] || row['Paciente'] || ""),
          parent: String(row['Responsável'] || row['Pai/Mãe'] || "N/A"),
          birthDate: String(bDate),
          professionalId: profId,
          lastCheckin: null,
          nextCheckin: null,
          phone: String(row['Telefone'] || row['Celular'] || row['Contato'] || row['Whatsapp'] || "")
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
        const dateTimeString = `${checkinDate}T${checkinTime}`;
        const visitDate = new Date(dateTimeString);

        const ageInfo = calculateAgeInfo(p.birthDate);
        let nextDate = new Date(visitDate);

        if (ageInfo.months < 12) {
          nextDate.setMonth(visitDate.getMonth() + 1);
        } else if (ageInfo.months < 24) {
          nextDate.setMonth(visitDate.getMonth() + 3);
        } else {
          nextDate.setFullYear(visitDate.getFullYear() + 1);
        }

        return { ...p, lastCheckin: dateTimeString, nextCheckin: nextDate.toISOString().split('T')[0] };
      }
      return p;
    });
    setPatients(updatedPatients);
    setIsCheckinModalOpen(false);
  };

  const requestDelete = (id: number) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId !== null) {
      setPatients(patients.filter(pat => pat.id !== deleteTargetId));
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const togglePatientSelection = (id: number) => {
    setSelectedPatients(prev =>
      prev.includes(id) ? prev.filter(patientId => patientId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map(p => p.id));
    }
  };

  const handleMultiDelete = () => {
    if (selectedPatients.length === 0) return;
    setIsMultiDeleteModalOpen(true);
  };

  const confirmMultiDelete = () => {
    setPatients(patients.filter(patient => !selectedPatients.includes(patient.id)));
    setSelectedPatients([]);
    setIsMultiDeleteModalOpen(false);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodo, completed: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.parent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProf = filterProfessional === 'all' || p.professionalId === filterProfessional;
    const matchesCheckin = filterCheckin === 'all'
      ? true
      : filterCheckin === 'done'
        ? p.lastCheckin !== null
        : p.lastCheckin === null;
    return matchesSearch && matchesProf && matchesCheckin;
  });

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8 text-stone-700">
      <div className="max-w-7xl mx-auto">
        <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm py-4 -mx-4 md:-mx-8 px-4 md:px-8 border-b border-brown-100/50 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-brown-900 tracking-tight mb-1">
              <Baby weight="fill" className="text-brown-500" />
              PueriCare
            </h1>
            <p className="text-brown-500 font-medium">Gestão de rotinas simplificada</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsProfModalOpen(true)}
              className="bg-white text-brown-700 border border-brown-200 px-5 py-3 rounded-xl font-bold hover:bg-brown-50 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Stethoscope size={18} />
              Doutoras
            </button>
            <label className={`cursor-pointer bg-white text-brown-600 border border-brown-200 px-5 py-3 rounded-xl font-bold hover:bg-brown-50 transition-all flex items-center gap-2 shadow-sm hover:shadow-md ${isLibLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isLibLoading ? <Spinner className="animate-spin" size={18} /> : <UploadSimple size={18} />}
              Importar Excel
              {!isLibLoading && <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={importExcel} />}
            </label>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-brown-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brown-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg shadow-brown-200/50"
            >
              <Plus size={20} />
              Novo Paciente
            </button>
            {selectedPatients.length > 0 && (
              <button
                onClick={handleMultiDelete}
                className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg shadow-red-200/50"
              >
                <Trash size={18} />
                Excluir ({selectedPatients.length})
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
              <div className="md:col-span-2 relative">
                <MagnifyingGlass className="absolute left-4 top-4 text-brown-300" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-transparent bg-white focus:border-brown-200 focus:bg-white focus:ring-4 focus:ring-brown-50 outline-none transition-all shadow-sm text-brown-800 placeholder:text-brown-300"
                />
              </div>
              <div className="relative">
                <Funnel className="absolute left-4 top-4 text-brown-400" size={20} />
                <select
                  value={filterProfessional}
                  onChange={(e) => setFilterProfessional(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-transparent bg-white focus:border-brown-200 focus:ring-4 focus:ring-brown-50 outline-none transition-all shadow-sm appearance-none font-bold text-brown-700 cursor-pointer"
                >
                  <option value="all">Todas as Doutoras</option>
                  {professionals.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <CheckCircle className="absolute left-4 top-4 text-brown-400" size={20} />
                <select
                  value={filterCheckin}
                  onChange={(e) => setFilterCheckin(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-transparent bg-white focus:border-brown-200 focus:ring-4 focus:ring-brown-50 outline-none transition-all shadow-sm appearance-none font-bold text-brown-700 cursor-pointer"
                >
                  <option value="all">Status: Todos</option>
                  <option value="done">Realizado</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
              <div className="bg-brown-900 text-white rounded-2xl p-3 flex items-center justify-center gap-4 shadow-lg shadow-brown-900/20">
                <Users size={24} className="text-brown-200" />
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">Pacientes</p>
                  <p className="text-2xl font-bold text-brown-200">{filteredPatients.length}</p>
                  {selectedPatients.length > 0 && (
                    <p className="text-[10px] text-brown-200 mt-1">
                      {selectedPatients.length} selecionado{selectedPatients.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-brown-100/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brown-100 bg-brown-50/50">
                      <th className="px-6 py-5 text-left text-xs font-black text-brown-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={toggleSelectAll}
                            className={`p-1 rounded border ${selectedPatients.length > 0 && selectedPatients.length === filteredPatients.length ? 'bg-brown-600 border-brown-600 text-white' : 'border-brown-200 text-brown-300 hover:border-brown-300'}`}
                          >
                            {selectedPatients.length > 0 && selectedPatients.length === filteredPatients.length ? (
                              <CheckSquare size={14} weight="fill" />
                            ) : (
                              <Square size={14} />
                            )}
                          </button>
                          Seleção
                        </div>
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-black text-brown-400 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-5 text-left text-xs font-black text-brown-400 uppercase tracking-wider">Responsável</th>
                      <th className="px-6 py-5 text-center text-xs font-black text-brown-400 uppercase tracking-wider">Idade</th>
                      <th className="px-6 py-5 text-left text-xs font-black text-brown-400 uppercase tracking-wider">Dra. Responsável</th>
                      <th className="px-6 py-5 text-center text-xs font-black text-brown-400 uppercase tracking-wider">Último Check-in</th>
                      <th className="px-6 py-5 text-center text-xs font-black text-brown-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brown-100">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-brown-300">
                          <div className="flex flex-col items-center gap-3">
                            <Users size={48} className="opacity-20" />
                            <p className="font-medium">Nenhum paciente encontrado</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map(p => {
                        const age = calculateAgeInfo(p.birthDate);
                        const prof = professionals.find(pr => pr.id === p.professionalId);
                        const isSelected = selectedPatients.includes(p.id);

                        const showFoodAlert = (age.months === 5 && age.days >= 25) || (age.months === 6 && age.days <= 5);

                        return (
                          <tr
                            key={p.id}
                            className={`hover:bg-brown-50/50 transition-colors ${isSelected ? 'bg-brown-50' : ''}`}
                          >
                            <td className="px-6 py-5">
                              <button
                                onClick={() => togglePatientSelection(p.id)}
                                className={`p-1.5 rounded border transition-all ${isSelected ? 'bg-brown-600 border-brown-600 text-white' : 'border-brown-200 text-brown-300 hover:border-brown-300'}`}
                              >
                                {isSelected ? <CheckSquare size={14} weight="fill" /> : <Square size={14} />}
                              </button>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-bold text-brown-900">{p.name}</p>
                                  <p className="text-xs text-brown-400 font-medium">Nasc: {new Date(p.birthDate).toLocaleDateString('pt-BR')}</p>
                                </div>
                                {p.phone && (
                                  <button
                                    onClick={() => { setSelectedPatientPhone({ name: p.name, phone: p.phone! }); setIsPhoneModalOpen(true); }}
                                    className="bg-green-100 text-green-600 p-1.5 rounded-full hover:bg-green-200 transition-colors"
                                    title="Ver Telefone"
                                  >
                                    <Phone size={14} weight="fill" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-brown-600 font-medium">
                              {p.parent}
                            </td>
                            <td className="px-6 py-5 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${age.months < 6 ? 'bg-green-100 text-green-700' :
                                  age.months < 12 ? 'bg-blue-100 text-blue-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                  {age.months < 1
                                    ? `${age.days} dias`
                                    : age.months < 12
                                      ? `${age.months} meses${age.days > 0 ? ` e ${age.days} dias` : ''}`
                                      : `${Math.floor(age.months / 12)} ano${Math.floor(age.months / 12) > 1 ? 's' : ''}${age.months % 12 > 0 ? ` e ${age.months % 12} meses` : ''}`
                                  }
                                </span>
                                {showFoodAlert && (
                                  <div className="flex items-center gap-1 mt-2 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                    <WarningCircle size={10} />
                                    <span className="text-[10px] font-bold">Intro. Alimentar</span>
                                  </div>
                                )}
                                {age.months >= 12 && (
                                  <div className="flex items-center gap-1 mt-2 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                                    <CalendarBlank size={10} />
                                    <span className="text-[10px] font-bold">Consultas Trimestrais</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              {prof ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-brown-400"></div>
                                  <span className="text-sm font-bold text-brown-700">{prof.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-stone-400 italic">Não definida</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center">
                              {p.lastCheckin ? (
                                <span className="text-sm font-bold text-brown-600 block">
                                  {new Date(p.lastCheckin).toLocaleDateString('pt-BR')}
                                  <span className="block text-xs text-stone-400 font-medium">
                                    {p.lastCheckin.includes('T') ? p.lastCheckin.split('T')[1].substring(0, 5) : ''}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-xs text-stone-300 font-medium">-</span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditPatient(p)}
                                  className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 rounded-lg transition-all"
                                  title="Editar"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => { setCheckinTargetId(p.id); setIsCheckinModalOpen(true); }}
                                  className="bg-brown-100 text-brown-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-brown-600 hover:text-white transition-all"
                                >
                                  Check-in
                                </button>
                                <button
                                  onClick={() => requestDelete(p.id)}
                                  className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                                  title="Excluir"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar - Todo List e Gerador de Mensagem */}
          <div className="lg:col-span-1 space-y-6">
            {/* Todo List */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-brown-100/50 p-6">
              <h2 className="text-xl font-black text-brown-900 mb-4 flex items-center gap-2">
                <CheckSquare className="text-brown-500" weight="fill" />
                Anotações
              </h2>

              <form onSubmit={addTodo} className="flex gap-2 mb-6">
                <input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="flex-1 px-4 py-2 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none text-sm font-medium text-brown-900"
                />
                <button type="submit" className="bg-brown-600 text-white p-2 rounded-xl hover:bg-brown-700 transition-colors shadow-md shadow-brown-200">
                  <Plus size={18} />
                </button>
              </form>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {todos.length === 0 ? (
                  <p className="text-center text-stone-300 text-sm italic py-4">Nenhuma anotação.</p>
                ) : (
                  todos.map(todo => (
                    <div key={todo.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-brown-50 transition-colors border border-transparent hover:border-brown-100">
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className={`mt-0.5 min-w-[1.125rem] ${todo.completed ? 'text-brown-400' : 'text-stone-300 hover:text-brown-400'} transition-colors`}
                      >
                        {todo.completed ? <CheckSquare size={18} weight="fill" /> : <Square size={18} />}
                      </button>
                      <span className={`text-sm font-medium flex-1 break-words ${todo.completed ? 'text-stone-400 line-through decoration-brown-200' : 'text-brown-700'}`}>
                        {todo.text}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all p-1"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gerador de Mensagem de Confirmação */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-brown-100/50 p-6">
              <h2 className="text-xl font-black text-brown-900 mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-500" weight="fill" />
                Gerar Mensagem
              </h2>

              <div className="space-y-4">
                {/* Seleção do Paciente */}
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Selecionar Paciente</label>
                  <select
                    value={selectedPatientForMessage?.id || ''}
                    onChange={(e) => {
                      const patientId = parseInt(e.target.value);
                      const patient = patients.find(p => p.id === patientId);
                      setSelectedPatientForMessage(patient || null);
                    }}
                    className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all text-sm font-medium text-brown-900"
                  >
                    <option value="">Selecione um paciente...</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - {patient.parent}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data da Consulta */}
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Data da Consulta</label>
                  <input
                    type="date"
                    value={selectedDateForMessage}
                    onChange={(e) => setSelectedDateForMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all text-sm font-medium text-brown-900"
                  />
                </div>

                {/* Hora da Consulta */}
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Hora da Consulta</label>
                  <input
                    type="time"
                    value={selectedTimeForMessage}
                    onChange={(e) => setSelectedTimeForMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all text-sm font-medium text-brown-900"
                  />
                </div>

                {/* Botão para Gerar Mensagem */}
                <button
                  onClick={generateConfirmationMessage}
                  disabled={!selectedPatientForMessage}
                  className={`w-full font-black py-3 rounded-xl transition-all ${!selectedPatientForMessage
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-green-600 text-white shadow-lg shadow-green-200/50 hover:bg-green-700 hover:shadow-green-200'
                    }`}
                >
                  Gerar Mensagem
                </button>

                {/* Área da Mensagem Gerada */}
                {generatedMessage && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-brown-500 uppercase">Mensagem Gerada</label>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 text-sm font-medium text-brown-600 hover:text-brown-800 transition-colors"
                      >
                        {isMessageCopied ? (
                          <>
                            <Check size={16} className="text-green-500" />
                            <span className="text-green-500">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <pre className="text-sm text-brown-800 whitespace-pre-wrap font-medium">
                        {generatedMessage}
                      </pre>
                    </div>

                    {/* Botão para WhatsApp */}
                    {selectedPatientForMessage?.phone && (
                      <a
                        href={`https://wa.me/${selectedPatientForMessage.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-md shadow-green-200"
                      >
                        <CheckCircle size={20} />
                        Enviar via WhatsApp
                      </a>
                    )}
                  </div>
                )}

                {/* Informações do Paciente Selecionado */}
                {selectedPatientForMessage && (
                  <div className="mt-3 p-3 rounded-xl border ${selectedPatientForMessage.lastCheckin ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}">
                    <p className="text-xs font-bold ${selectedPatientForMessage.lastCheckin ? 'text-green-800' : 'text-yellow-800'} mb-1">
                      {selectedPatientForMessage.lastCheckin ? '✓ Consulta agendada' : '⚠️ Sem consulta agendada'}
                    </p>
                    <p className="text-sm font-medium ${selectedPatientForMessage.lastCheckin ? 'text-green-900' : 'text-yellow-900'}">
                      {selectedPatientForMessage.name} - {selectedPatientForMessage.parent}
                    </p>

                    {selectedPatientForMessage.lastCheckin && (
                      <p className="text-xs ${selectedPatientForMessage.lastCheckin ? 'text-green-700' : 'text-yellow-700'} mt-1">
                        📅 Última consulta: {new Date(selectedPatientForMessage.lastCheckin).toLocaleDateString('pt-BR')}
                        {selectedPatientForMessage.lastCheckin.includes('T') && (
                          <span className="ml-2">
                            🕒 {selectedPatientForMessage.lastCheckin.split('T')[1].substring(0, 5)}
                          </span>
                        )}
                      </p>
                    )}

                    {selectedPatientForMessage.phone && (
                      <p className="text-xs ${selectedPatientForMessage.lastCheckin ? 'text-green-700' : 'text-yellow-700'} mt-1">
                        📞 {selectedPatientForMessage.phone}
                      </p>
                    )}

                    {!selectedPatientForMessage.lastCheckin && (
                      <p className="text-xs text-yellow-600 mt-2 font-medium">
                        ⚠️ Faça um check-in primeiro para agendar a consulta
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Novo Paciente */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-6 top-6 text-stone-300 hover:text-stone-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-brown-900 mb-6">Novo Paciente</h2>

            <form onSubmit={handleAddPatient} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Nome da Criança</label>
                <input required name="name" className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900" placeholder="Ex: Maria Alice" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Nascimento</label>
                  <input required type="date" name="birthDate" className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Responsável</label>
                  <input required name="parent" className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900" placeholder="Ex: Mãe" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Telefone / WhatsApp</label>
                <input name="phone" className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900" placeholder="Ex: (11) 99999-9999" />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Doutora Responsável</label>
                <div className="grid grid-cols-2 gap-2">
                  {professionals.length === 0 ? (
                    <div className="col-span-2 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 text-sm font-medium flex items-center gap-2">
                      <WarningCircle size={16} />
                      Cadastre uma doutora primeiro
                    </div>
                  ) : (
                    professionals.map(prof => (
                      <label key={prof.id} className="cursor-pointer">
                        <input type="radio" name="professionalId" value={prof.id} defaultChecked={prof === professionals[0]} className="peer hidden" />
                        <div className="p-3 rounded-xl bg-stone-50 border-2 border-transparent peer-checked:border-brown-500 peer-checked:bg-brown-50 text-stone-500 peer-checked:text-brown-700 font-bold text-sm transition-all text-center">
                          {prof.name}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={professionals.length === 0}
                className={`w-full font-black py-4 rounded-xl mt-2 transition-all ${professionals.length === 0
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-brown-600 text-white shadow-lg shadow-brown-200/50 hover:bg-brown-700 hover:shadow-brown-200'
                  }`}
              >
                Salvar Paciente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Paciente */}
      {isEditModalOpen && editingPatient && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative">
            <button
              onClick={() => { setIsEditModalOpen(false); setEditingPatient(null); }}
              className="absolute right-6 top-6 text-stone-300 hover:text-stone-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-brown-900 mb-6">Editar Paciente</h2>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Nome da Criança</label>
                <input
                  required
                  name="editName"
                  defaultValue={editingPatient.name}
                  className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900"
                  placeholder="Ex: Maria Alice"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Nascimento</label>
                  <input
                    required
                    type="date"
                    name="editBirthDate"
                    defaultValue={editingPatient.birthDate}
                    className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Responsável</label>
                  <input
                    required
                    name="editParent"
                    defaultValue={editingPatient.parent}
                    className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900"
                    placeholder="Ex: Mãe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Telefone / WhatsApp</label>
                <input
                  name="editPhone"
                  defaultValue={editingPatient.phone || ''}
                  className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none transition-all font-medium text-brown-900"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-500 uppercase mb-2">Doutora Responsável</label>
                <div className="grid grid-cols-2 gap-2">
                  {professionals.length === 0 ? (
                    <div className="col-span-2 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 text-sm font-medium flex items-center gap-2">
                      <WarningCircle size={16} />
                      Cadastre uma doutora primeiro
                    </div>
                  ) : (
                    professionals.map(prof => (
                      <label key={prof.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="editProfessionalId"
                          value={prof.id}
                          defaultChecked={editingPatient.professionalId === prof.id}
                          className="peer hidden"
                        />
                        <div className="p-3 rounded-xl bg-stone-50 border-2 border-transparent peer-checked:border-brown-500 peer-checked:bg-brown-50 text-stone-500 peer-checked:text-brown-700 font-bold text-sm transition-all text-center">
                          {prof.name}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={professionals.length === 0}
                className={`w-full font-black py-4 rounded-xl mt-2 transition-all ${professionals.length === 0
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-brown-600 text-white shadow-lg shadow-brown-200/50 hover:bg-brown-700 hover:shadow-brown-200'
                  }`}
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Profissionais */}
      {isProfModalOpen && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-brown-900">Doutoras</h3>
              <button onClick={() => setIsProfModalOpen(false)}><X className="text-stone-300 hover:text-stone-500" /></button>
            </div>

            <form onSubmit={handleAddProfessional} className="flex gap-3 mb-6">
              <input name="profName" placeholder="Nome da Dra..." required className="flex-1 px-4 py-3 bg-stone-50 border-0 rounded-xl focus:ring-2 focus:ring-brown-200 outline-none text-brown-900" />
              <button type="submit" className="bg-brown-600 text-white p-3 rounded-xl hover:bg-brown-700 transition-colors shadow-md shadow-brown-200">
                <Plus />
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {professionals.map(prof => (
                <div key={prof.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="font-bold text-brown-900">{prof.name}</span>
                  <button onClick={() => removeProfessional(prof.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                    <Trash size={18} />
                  </button>
                </div>
              ))}
              {professionals.length === 0 && (
                <p className="text-center text-stone-400 py-4 text-sm italic">Nenhuma doutora cadastrada.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Check-in */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <CalendarBlank size={32} className="mx-auto mb-4 text-brown-500" />
            <h3 className="text-xl font-black text-brown-900 mb-6">Data e Hora da Consulta</h3>
            <div className="flex gap-3 mb-6">
              <input
                type="date"
                value={checkinDate}
                onChange={e => setCheckinDate(e.target.value)}
                className="flex-1 p-4 bg-stone-50 border-0 rounded-xl text-center font-black text-brown-900 focus:ring-2 focus:ring-brown-200 outline-none"
              />
              <input
                type="time"
                value={checkinTime}
                onChange={e => setCheckinTime(e.target.value)}
                className="w-32 p-4 bg-stone-50 border-0 rounded-xl text-center font-black text-brown-900 focus:ring-2 focus:ring-brown-200 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsCheckinModalOpen(false)} className="flex-1 py-3 font-bold text-stone-400 hover:text-stone-600 transition-colors">Cancelar</button>
              <button onClick={confirmCheckin} className="flex-1 bg-brown-600 text-white py-3 rounded-xl font-black shadow-lg shadow-brown-200 hover:bg-brown-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <WarningCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-brown-900 mb-2">Excluir Paciente?</h3>
            <p className="text-stone-500 font-medium mb-8">Esta ação não poderá ser desfeita.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 font-bold text-stone-400 hover:text-stone-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Telefone */}
      {isPhoneModalOpen && selectedPatientPhone && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center relative">
            <button
              onClick={() => setIsPhoneModalOpen(false)}
              className="absolute right-6 top-6 text-stone-300 hover:text-stone-500 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={32} className="text-green-600" weight="fill" />
            </div>
            <h3 className="text-xl font-black text-brown-900 mb-1">Contato</h3>
            <p className="text-stone-400 font-medium mb-6">{selectedPatientPhone.name}</p>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 mb-6">
              <a href={`tel:${selectedPatientPhone.phone}`} className="text-2xl font-black text-brown-800 hover:text-green-600 transition-colors">
                {selectedPatientPhone.phone}
              </a>
            </div>

            <button
              onClick={() => setIsPhoneModalOpen(false)}
              className="w-full bg-brown-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-brown-200 hover:bg-brown-700 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão Múltipla */}
      {isMultiDeleteModalOpen && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <WarningCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-brown-900 mb-2">
              Excluir {selectedPatients.length} {selectedPatients.length === 1 ? 'paciente' : 'pacientes'}?
            </h3>
            <p className="text-stone-500 font-medium mb-8">
              Esta ação não poderá ser desfeita. {selectedPatients.length > 1 && 'Todos os pacientes selecionados serão excluídos.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsMultiDeleteModalOpen(false)}
                className="flex-1 py-3 font-bold text-stone-400 hover:text-stone-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMultiDelete}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;