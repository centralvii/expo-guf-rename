import { memo, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './Select.css';

export interface SelectOption<T extends string = string> {
  /** Значение, которое будет передано в onChange */
  value: T;
  /** Отображаемый текст в списке */
  label: string;
  /** Опциональная иконка слева от текста */
  icon?: ReactNode;
  /** Опциональный цвет для значения (используется через CSS-переменную) */
  color?: string;
  /** Опциональное описание под label */
  description?: string;
}

export type SelectSize = 'sm' | 'md' | 'lg';

interface SelectProps<T extends string = string> {
  /** Текущее выбранное значение */
  value: T;
  /** Колбэк при выборе */
  onChange: (value: T) => void;
  /** Список опций */
  options: SelectOption<T>[];
  /** Заголовок над селектом */
  label?: string;
  /** Плейсхолдер, если value не найдено среди options */
  placeholder?: string;
  /** Размер */
  size?: SelectSize;
  /** Блокировка */
  disabled?: boolean;
  /** Растянуть на всю ширину родителя */
  fullWidth?: boolean;
  /** Дополнительный класс */
  className?: string;
}

/**
 * Универсальный кастомный селект с поддержкой иконок и цветов для опций.
 * Полностью соответствует стилям design system.
 */
export const Select = memo(function Select<T extends string = string>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Выбрать...',
  size = 'md',
  disabled = false,
  fullWidth = false,
  className = '',
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      onChange(option.value);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleToggle = useCallback(() => {
    if (!disabled) setIsOpen((v) => !v);
  }, [disabled]);

  // Закрытие при клике вне
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const containerClass = [
    'ui-select',
    `ui-select--${size}`,
    fullWidth ? 'ui-select--full' : '',
    disabled ? 'ui-select--disabled' : '',
    isOpen ? 'ui-select--open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const selectedStyle = selected?.color
    ? ({ '--select-color': selected.color } as React.CSSProperties)
    : undefined;

  return (
    <div className={containerClass} ref={ref}>
      {label && <label className="ui-label ui-select__label">{label}</label>}
      <button
        type="button"
        className="ui-select__trigger"
        onClick={handleToggle}
        disabled={disabled}
        style={selectedStyle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="ui-select__value">
          {selected?.icon && <span className="ui-select__icon">{selected.icon}</span>}
          <span className="ui-select__text">
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown size={14} className="ui-select__chevron" />
      </button>

      {isOpen && (
        <div className="ui-select__dropdown" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            const optionStyle = option.color
              ? ({ '--select-color': option.color } as React.CSSProperties)
              : undefined;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`ui-select__option ${isSelected ? 'ui-select__option--active' : ''}`}
                onClick={() => handleSelect(option)}
                style={optionStyle}
              >
                {option.icon && <span className="ui-select__option-icon">{option.icon}</span>}
                <div className="ui-select__option-info">
                  <span className="ui-select__option-label">{option.label}</span>
                  {option.description && (
                    <span className="ui-select__option-desc">{option.description}</span>
                  )}
                </div>
                {isSelected && <Check size={14} className="ui-select__option-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}) as <T extends string = string>(props: SelectProps<T>) => React.JSX.Element;
