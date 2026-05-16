import { memo, type CSSProperties, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import './SearchInput.css';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'className' | 'style'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
}

export const SearchInput = memo(({
  value,
  onChange,
  onClear,
  placeholder = 'Поиск...',
  wrapperClassName = '',
  wrapperStyle,
  ...inputProps
}: SearchInputProps) => {
  return (
    <div className={`search-input-wrap ${wrapperClassName}`} style={wrapperStyle}>
      <Search size={14} className="search-input-wrap__icon" />
      <input
        type="text"
        className="search-input-wrap__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...inputProps}
      />
      {value && onClear && (
        <button type="button" className="search-input-wrap__clear" onClick={onClear} aria-label="Очистить поиск" tabIndex={-1}>
          <X size={14} />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';