import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-restore anim-fade-in">
          <h2>Что-то пошло не так</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="ui-btn ui-btn--primary" onClick={this.handleReset}>Попробовать снова</button>
            <button className="ui-btn ui-btn--secondary" onClick={() => window.location.reload()}>Перезагрузить</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
