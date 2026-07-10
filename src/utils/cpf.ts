export const validateCPF = (cpf: string): boolean => {
  // 1. Sanitização de Entrada: remove tudo o que não for dígito
  const cleanCPF = cpf.replace(/\D/g, "");

  // 2. Verificação de Tamanho
  if (cleanCPF.length !== 11) return false;

  // 3. Rejeição de Falsos Positivos (sequências repetidas)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // 4. Cálculo Matemático (Dígitos Verificadores)
  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

  // 5. Retorno Booleano
  return true;
};
