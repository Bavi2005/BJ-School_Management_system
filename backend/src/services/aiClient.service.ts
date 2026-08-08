import { config } from '../config/env';
import { AIPredictionResult, AIModelType, AIServiceResponse } from '@school-mgmt/shared';
import { AIServiceError } from '../utils/AppError';
import { createLogger } from '../lib/logger';
import { retry } from '../utils/retry';

const log = createLogger('ai-client');

interface AIServiceRequest<T> {
  modelType: AIModelType;
  data: T;
}

export interface ChatResponse {
  response: string;
  source: string;
  confidence: number;
}

export class AIClientService {
  private static instance: AIClientService;

  static getInstance(): AIClientService {
    if (!AIClientService.instance) {
      AIClientService.instance = new AIClientService();
    }
    return AIClientService.instance;
  }

  private async request<TRequest, TResponse>(
    endpoint: string,
    body: AIServiceRequest<TRequest>
  ): Promise<AIServiceResponse<TResponse>> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.aiServiceUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': config.aiApiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        log.error(`AI service error ${response.status}`, { endpoint, errorBody });
        throw new AIServiceError(`AI service returned ${response.status}: ${errorBody}`);
      }

      return (await response.json()) as AIServiceResponse<TResponse>;
    } catch (err) {
      if (err instanceof AIServiceError) throw err;
      log.error(`AI service request failed`, { endpoint, error: (err as Error).message });
      throw new AIServiceError('AI service is unavailable. Please try again later.');
    }
  }

  async predictPerformance<T = unknown>(data: T): Promise<AIServiceResponse<AIPredictionResult>> {
    return retry(
      () => this.request<T, AIPredictionResult>('/predict/performance', {
        modelType: AIModelType.PERFORMANCE_PREDICTION,
        data,
      }),
      2,
      1000
    );
  }

  async predictAttendanceRisk<T = unknown>(data: T): Promise<AIServiceResponse<AIPredictionResult>> {
    return retry(
      () => this.request<T, AIPredictionResult>('/predict/attendance-risk', {
        modelType: AIModelType.ATTENDANCE_RISK,
        data,
      }),
      2,
      1000
    );
  }

  async generateSchedule<T = unknown>(data: T): Promise<AIServiceResponse<AIPredictionResult>> {
    return this.request<T, AIPredictionResult>('/schedule/generate', {
      modelType: AIModelType.SMART_SCHEDULING,
      data,
    });
  }

  async autoGrade<T = unknown>(data: T): Promise<AIServiceResponse<AIPredictionResult>> {
    return this.request<T, AIPredictionResult>('/grade/auto', {
      modelType: AIModelType.AUTO_GRADING,
      data,
    });
  }

  async sendChatMessage<T = unknown>(data: T): Promise<AIServiceResponse<ChatResponse>> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.aiServiceUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': config.aiApiKey },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        log.error('AI service error', { errorBody });
        throw new AIServiceError(`AI service returned ${response.status}`);
      }

      return (await response.json()) as AIServiceResponse<ChatResponse>;
    } catch (err) {
      if (err instanceof AIServiceError) throw err;
      log.error(`AI service chat request failed`, { error: (err as Error).message });
      throw new AIServiceError('AI service is unavailable. Please try again later.');
    }
  }

  async generateRecommendations<T = unknown>(data: T): Promise<AIServiceResponse<AIPredictionResult>> {
    return this.request<T, AIPredictionResult>('/recommend/generate', {
      modelType: AIModelType.RECOMMENDATION,
      data,
    });
  }

  async detectAnomalies<T = unknown>(data: T): Promise<AIServiceResponse<AIPredictionResult>> {
    return this.request<T, AIPredictionResult>('/detect/anomalies', {
      modelType: AIModelType.ANOMALY_DETECTION,
      data,
    });
  }

  async checkHealth(): Promise<{ status: string; models: string[] }> {
    try {
      const response = await fetch(`${config.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { status: 'unhealthy', models: [] };
      }
      return (await response.json()) as { status: string; models: string[] };
    } catch {
      return { status: 'unhealthy', models: [] };
    }
  }
}

export const aiClient = AIClientService.getInstance();