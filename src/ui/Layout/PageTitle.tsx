import { memo, type ReactNode } from 'react';

interface PageTitleProps {
  /** Основной текст заголовка */
  children: ReactNode;
  /** Индикатор несохранённых изменений */
  isDirty?: boolean;
  /** Дополнительный CSS класс */
  className?: string;
}

/**
 * Единый компонент заголовка страницы/инструмента.
 * Используется в Toolbar.Left для консистентного отображения.
 *
 * @example
 * <Toolbar>
 *   <Toolbar.Left>
 *     <PageTitle>Настройки</PageTitle>
 *   </Toolbar.Left>
 * </Toolbar>
 *
 * <Toolbar>
 *   <Toolbar.Left>
 *     <PageTitle isDirty={hasChanges}>Документ.pdf</PageTitle>
 *   </Toolbar.Left>
 * </Toolbar>
 */
export const PageTitle = memo(function PageTitle({
  children,
  isDirty = false,
  className = '',
}: PageTitleProps) {
  return (
    <h2 className={`ui-page-title ${className}`}>
      {children}
      {isDirty && <span className="ui-page-title__dot" aria-label="Есть несохранённые изменения">●</span>}
    </h2>
  );
});
