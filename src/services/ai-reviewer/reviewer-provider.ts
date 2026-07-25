import type {
  ReviewerProviderRequest,
  ReviewerProviderResult,
} from './types'

export interface AiReviewerProvider {
  review(request: ReviewerProviderRequest): Promise<ReviewerProviderResult>
}

export interface ReviewerTransport {
  complete(request: ReviewerProviderRequest & {
    purpose: 'reviewer'
  }): Promise<ReviewerProviderResult>
}

export class RealAiReviewerProvider implements AiReviewerProvider {
  constructor(private readonly transport: ReviewerTransport) {}

  review(request: ReviewerProviderRequest): Promise<ReviewerProviderResult> {
    return this.transport.complete({
      ...request,
      purpose: 'reviewer',
    })
  }
}

export class MockAiReviewerProvider implements AiReviewerProvider {
  constructor(
    private readonly response: ReviewerProviderResult | Error,
  ) {}

  async review(
    _request: ReviewerProviderRequest,
  ): Promise<ReviewerProviderResult> {
    if (this.response instanceof Error) throw this.response
    return this.response
  }
}
