import { useEffect, useRef } from 'react';

/**
 * Hook que executa um efeito apenas uma vez (como useEffect sem dependências)
 * Evita execução duplicada em modo Strict de desenvolvimento
 * 
 * @param effect Função do efeito
 * @param cleanup Função de cleanup (opcional)
 * 
 * @example
 * useEffectOnce(() => {
 *   const unsubscribe = onSnapshot(...);
 *   return () => unsubscribe();
 * });
 */
export function useEffectOnce(
  effect: () => void | (() => void),
  cleanup?: () => void
): void {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const cleanupFn = effect();
    return () => {
      if (typeof cleanupFn === 'function') cleanupFn();
      if (cleanup) cleanup();
    };
  }, []);
}

/**
 * Variante que permite dependências (útil para controlar quando re-executar)
 */
export function useEffectOnceWithDeps(
  effect: () => void | (() => void),
  deps: React.DependencyList
): void {
  const prevDepsRef = useRef<React.DependencyList>();

  useEffect(() => {
    const depsChanged = !prevDepsRef.current || 
      prevDepsRef.current.length !== deps.length ||
      prevDepsRef.current.some((dep, i) => dep !== deps[i]);

    if (!depsChanged) return;

    prevDepsRef.current = deps;
    const cleanupFn = effect();
    
    return () => {
      if (typeof cleanupFn === 'function') cleanupFn();
    };
  }, deps);
}
