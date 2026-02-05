import { useRef, useCallback, useState } from 'react';

/**
 * Hook para debouncer funções assíncronas
 * Evita múltiplas requisições simultâneas ao clicar repetidamente em botões
 * 
 * @param callback Função a ser debounceada
 * @param delay Delay em ms (padrão: 300ms)
 * @returns Função debounceada
 * 
 * @example
 * const handleSave = useDebounce(async () => {
 *   await updateData();
 * }, 500);
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: any[]) => {
    // Limpa timeout anterior para evitar chamadas múltiplas rápidas
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Aguarda delay e executa
    timeoutRef.current = setTimeout(async () => {
      try {
        await callback(...args);
      } catch (error) {
        console.error('Erro na função debounceada:', error);
      }
    }, delay);
  }, [callback, delay]) as T;
}

/**
 * Hook para criar uma versão debounceada de uma função com estado de loading
 * Útil para botões que precisam mostrar loading durante a requisição
 * 
 * @param callback Função assíncrona a ser debounceada
 * @param delay Delay em ms
 * @returns [função, isLoading]
 */
export function useDebouncedAsync<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 300
): [T, boolean] {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedFn = useCallback(async (...args: any[]) => {
    if (isLoading) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        await callback(...args);
      } catch (error) {
        console.error('Erro na função debounceada:', error);
      } finally {
        setIsLoading(false);
      }
    }, delay);
  }, [callback, delay, isLoading]) as T;

  return [debouncedFn, isLoading];
}
