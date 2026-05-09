import { Component } from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-8">
        <div className="w-full max-w-md rounded-radius-lg border border-line bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-t-strong">
            오류가 발생했습니다
          </h2>
          <p className="mb-6 text-sm text-t-mute">
            {this.state.error?.message ?? '알 수 없는 오류'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="h-10 rounded-radius-sm border border-line-strong bg-card px-4 text-sm font-semibold text-t-strong transition-colors hover:bg-gray-200"
            >
              새로고침
            </button>
            <button
              onClick={() => {
                window.location.href = '/'
              }}
              className="h-10 rounded-radius-sm bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    )
  }
}
