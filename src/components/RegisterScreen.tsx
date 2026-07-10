import React, { useState, useEffect } from "react";
import { ScreenId } from "../types";
import { ArrowLeft, User, Mail, FileText, Truck, ShieldCheck, AlertCircle, RefreshCw, X, Check, Lock, Phone } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { validateCPF } from "../utils/cpf";

interface RegisterScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function RegisterScreen({ onNavigate }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    plate: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 9) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    } else if (digits.length > 6) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    } else if (digits.length > 3) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    return masked;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 10) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 6) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 2) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
      masked = `(${digits}`;
    }
    return masked;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "cpf") {
      setFormData((prev) => ({
        ...prev,
        cpf: formatCPF(value)
      }));
    } else if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhone(value)
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.cpf || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError("Por favor, preencha todos os campos obrigatórios do cadastro.");
      return;
    }

    const cleanCPF = formData.cpf.replace(/\D/g, "");
    if (!cleanCPF || cleanCPF.length !== 11 || !validateCPF(formData.cpf)) {
      setError("Por favor, informe um CPF válido.");
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!cleanPhone || (cleanPhone.length !== 10 && cleanPhone.length !== 11)) {
      setError("Por favor, informe um número de telefone válido com DDD (10 ou 11 dígitos).");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (!agreedToTerms) {
      setError("Você deve aceitar os Termos de Uso operacionais para prosseguir.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. Create User
      const result = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      await updateProfile(result.user, { displayName: formData.name.trim() });
      
      // 2. Save to Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name: formData.name.trim() || result.user.displayName || "Motorista",
        email: formData.email.trim() || result.user.email || "",
        cpf: formData.cpf.trim(),
        phone: formData.phone.trim(),
        plate: formData.plate.trim(),
        company: formData.company.trim(),
        createdAt: new Date().toISOString()
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => {
        onNavigate(ScreenId.RouteOverview);
      }, 2000);
    } catch (err: any) {
      console.error("Erro no cadastro manual:", err);

      let errMsg = "Ocorreu um erro ao criar a conta. Tente novamente.";

      if (err?.code === "auth/email-already-in-use") {
        errMsg = "Este e-mail já está em uso. Tente fazer login.";
      } else if (err?.code === "auth/invalid-email") {
        errMsg = "Formato de e-mail inválido.";
      } else if (err?.code === "auth/weak-password") {
        errMsg = "A senha deve ter no mínimo 6 caracteres.";
      } else if (err?.code === "auth/operation-not-allowed") {
        errMsg = "Cadastro por e-mail indisponível no momento.";
      } else {
        errMsg = "Não foi possível salvar seu cadastro. Verifique sua conexão e tente novamente.";
      }

      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="register-screen" className="flex flex-col justify-between h-full bg-slate-50 p-6 font-sans overflow-y-auto relative">
      <div className="space-y-5">
        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(ScreenId.Login)}
            className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
            NOVO CADASTRO
          </h2>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-4 my-6 animate-fade-in">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-pulse">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-emerald-950">Cadastro Concluído com Sucesso!</h3>
              <p className="text-xs text-emerald-800/80 leading-relaxed">
                Seus dados foram configurados e associados à sua conta com sucesso.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Redirecionando você para o painel principal...
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Crie sua Conta</h3>
              <p className="text-xs text-slate-400 mt-1">
                Preencha os dados abaixo para criar sua conta.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg font-medium border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {/* Nome */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                  Nome Completo {!formData.name && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: João da Silva"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                  Endereço de E-mail {!formData.email && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="motorista@empresa.com"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                  />
                </div>
              </div>

              {/* CPF e Telefone (Mandatory) */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    CPF {!formData.cpf && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400">
                      <FileText className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      disabled={loading}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Telefone {!formData.phone && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      disabled={loading}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Placa e Transportadora (Optional) */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    PLACA (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    name="plate"
                    value={formData.plate}
                    onChange={handleChange}
                    placeholder="ABC-1234"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    EMPRESA (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Ex: Logística SA"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                  />
                </div>
              </div>

              {/* Senhas */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Definir Senha {!formData.password && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mín. 6 char"
                      disabled={loading}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Confirmar Senha {!formData.confirmPassword && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repita a senha"
                      disabled={loading}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Terms of Use Checkbox */}
              <div className="flex items-start gap-2.5 py-1 select-none">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                    agreedToTerms 
                      ? "bg-blue-950 border-blue-950 text-white" 
                      : "bg-slate-100 border-slate-300"
                  }`}
                >
                  {agreedToTerms && (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  )}
                </button>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  Declaro que li e concordo com os{" "}
                  <button 
                    type="button" 
                    onClick={() => setShowTermsModal(true)} 
                    className="text-blue-900 font-extrabold hover:underline"
                  >
                    Termos de Uso operacionais
                  </button>{" "}
                  do sistema SmartLine.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 tracking-wider text-xs transition uppercase disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> SALVANDO...
                  </>
                ) : (
                  "FINALIZAR CADASTRO"
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-400 py-4">
        Ao se cadastrar, você aceita nossos termos de uso operacionais.
      </div>

      {/* Popup Modal for Terms of Use */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-blue-950">
                <FileText className="w-4.5 h-4.5 stroke-[2.5]" />
                <h3 className="text-xs font-black uppercase tracking-widest">TERMOS DE USO</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable text) */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-slate-600 text-xs leading-relaxed">
              <p>
                <strong>1. Objeto:</strong> O presente aplicativo visa otimizar os fluxos de chegada e agendamento de cargas no Porto de Tubarão e pátios logísticos credenciados.
              </p>
              <p>
                <strong>2. Compartilhamento de Tráfego:</strong> Ao emitir um Alerta de Tráfego, o usuário se compromete a compartilhar apenas informações verídicas e constatadas na rodovia BR-101 ou adjacências.
              </p>
              <p>
                <strong>3. Geolocalização:</strong> Este aplicativo utiliza sua geolocalização em tempo real para calcular estimativas precisas de tráfego, estimativa de chegada (ETA) e sugerir pontos de apoio adequados.
              </p>
              <p>
                <strong>4. Responsabilidade:</strong> O motorista não deve utilizar ou manipular o aplicativo enquanto estiver ativamente dirigindo o veículo na rodovia. Utilize pontos de apoio para interações complexas.
              </p>
              <p className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                Última atualização: Março de 2026.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition uppercase flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> ACEITAR
              </button>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition uppercase"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
