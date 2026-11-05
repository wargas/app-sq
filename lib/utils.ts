export { cn } from "cn"


/**
 * Transforma uma string em um nome de arquivo válido e seguro.
 * 
 * @param input - O texto original que será convertido.
 * @param replacement - O caractere que substituirá os caracteres inválidos (padrão: '').
 * @returns Um nome de arquivo limpo e seguro.
 */
export function sanitizeFilename(input: string, replacement: string = ''): string {
  if (!input) return 'arquivo_sem_nome';

  // 1. Caracteres proibidos no Windows/Linux/Mac: \ / ? % * : | " < >
  // Também remove caracteres de controle (0-31) e bytes nulos
  const illegalRe = /[\/\?<>\\:\*\|":\x00-\x1f\x80-\x9f]/g;
  
  // 2. Caracteres reservados do sistema (fim de linha, etc) para Windows
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  const windowsTrailingRe = /[\. ]+$/;

  let sanitized = input
    .normalize('NFD') // Decompõe caracteres acentuados (ex: á -> a + ´)
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos
    .replace(illegalRe, replacement)
    .replace(/\s+/g, '-') // Substitui espaços por hifens
    .replace(windowsTrailingRe, ''); // Remove pontos ou espaços no final

  // Se o nome se tornar vazio ou for uma palavra reservada do Windows
  if (!sanitized || reservedRe.test(sanitized) || windowsReservedRe.test(sanitized)) {
    sanitized = 'arquivo_valido';
  }

  // Limita o tamanho máximo (sistemas operacionais geralmente limitam a 255 caracteres)
  return sanitized.substring(0, 255);
}
