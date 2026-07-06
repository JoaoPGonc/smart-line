import React, { useState, useEffect } from "react";
import { ScreenId } from "../types";
import { ArrowLeft, User, Mail, FileText, Truck, ShieldCheck, AlertCircle, RefreshCw, X, Check, Lock } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface RegisterScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function RegisterScreen({ onNavigate }: RegisterScreenProps) {
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    plate: "",
    company: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword || !confirmPassword) {
      setError("Por favor, preencha todos os campos do cadastro por e-mail.");
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }
    if (registerPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setError("");
    setRegisterLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      setCurrentUser(result.user);
      setFormData((prev) => ({
        ...prev,
        email: registerEmail.trim(),
      }));
    } catch (err: any) {
      console.error("Erro no cadastro manual:", err);
      let errMsg = "Ocorreu um erro ao criar a conta.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "Este endereço de e-mail já está em uso.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Formato de e-mail inválido.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "A senha deve ser mais forte (mínimo de 6 caracteres).";
      }
      setError(errMsg);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Sync authenticated user state locally to drive the step-by-step UI
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || user.displayName || "",
          email: prev.email || user.email || "",
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGoogleConnect = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setCurrentUser(result.user);
      setFormData((prev) => ({
        ...prev,
        name: prev.name || result.user.displayName || "",
        email: prev.email || result.user.email || "",
      }));
    } catch (err: any) {
      console.error("Erro ao autenticar com Google no cadastro:", err);
      setError("Falha ao conectar com sua conta Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError("Por favor, conecte sua conta do Google primeiro.");
      return;
    }

    if (!agreedToTerms) {
      setError("Você deve aceitar os Termos de Uso operacionais para prosseguir.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Create or update user profile document in Firestore
      await setDoc(doc(db, "users", currentUser.uid), {
        uid: currentUser.uid,
        name: formData.name.trim() || currentUser.displayName || "Motorista",
        email: formData.email.trim() || currentUser.email || "",
        cpf: formData.cpf.trim(),
        plate: formData.plate.trim(),
        company: formData.company.trim(),
        createdAt: new Date().toISOString()
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => {
        onNavigate(ScreenId.Schedule);
      }, 2000);
    } catch (err: any) {
      console.error("Erro ao salvar cadastro no Firestore:", err);
      handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
      setError("Ocorreu um erro ao finalizar o seu cadastro.");
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
                Seus dados foram configurados e associados à sua conta Google com sucesso.
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
                Seu cadastro pode ser feito de forma manual ou utilizando o Google.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg font-medium border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!currentUser ? (
              /* Step 1: Request Google or Email registration */
              <div className="space-y-4">
                {/* Manual registration fields */}
                <form onSubmit={handleManualRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1">
                      Endereço de E-mail
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="motorista@empresa.com"
                        disabled={registerLoading || loading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1">
                      Definir Senha
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        disabled={registerLoading || loading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita sua senha"
                        disabled={registerLoading || loading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading || loading}
                    className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 tracking-wider text-xs transition uppercase disabled:opacity-50 cursor-pointer"
                  >
                    {registerLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Cadastrar com E-mail"
                    )}
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-bold tracking-widest uppercase">OU</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Você também pode se cadastrar instantaneamente usando o Google:
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleConnect}
                    disabled={registerLoading || loading}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2.5 tracking-wider text-xs transition uppercase disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0 fill-current text-slate-600" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    )}
                    Conectar Conta Google
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Show Optional Info Form + Terms */
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Conta Vinculada: {currentUser.email}</span>
                </div>

                {/* Nome */}
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    NOME COMPLETO (OPCIONAL)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-slate-100 border border-transparent rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
                </div>

                {/* E-mail (Read-only) */}
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    E-MAIL VINCULADO
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400/60">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-slate-100/60 border border-transparent rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-500 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* CPF e Placa */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      CPF (OPCIONAL)
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-100 border border-transparent rounded-xl py-2.5 px-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
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
                      className="w-full bg-slate-100 border border-transparent rounded-xl py-2.5 px-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                    />
                  </div>
                </div>

                {/* Transportadora */}
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    TRANSPORTADORA / EMPRESA (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Transportadora Logística SA"
                    className="w-full bg-slate-100 border border-transparent rounded-xl py-2.5 px-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                  />
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
                  className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md tracking-wider text-xs transition uppercase flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
            )}
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
