import 'package:dio/dio.dart';

// API URL injected at compile time via --dart-define
const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://stan-backend-production.up.railway.app',
);

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final String baseUrl = apiBaseUrl;

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );

    // Add interceptors for logging
    _dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
      ),
    );
  }

  // Health check
  Future<Map<String, dynamic>> healthCheck() async {
    try {
      final response = await _dio.get('/api/health');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Generate briefing
  Future<Map<String, dynamic>> generateBriefing({
    required String stanName,
    String? userId,
  }) async {
    try {
      final response = await _dio.post(
        '/api/generate-briefing',
        data: {
          'stan': {
            'name': stanName,
            'categories': {'primary': 'general'},
          },
          'userId': userId,
        },
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Get popular stans
  Future<Map<String, dynamic>> getPopularStans() async {
    try {
      final response = await _dio.get('/api/popular-stans');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Get today's briefings
  Future<List<dynamic>> getTodaysBriefings(String? userId) async {
    try {
      final response = await _dio.get(
        '/api/briefings/today',
        queryParameters: userId != null ? {'userId': userId} : null,
      );
      return response.data['briefings'] ?? [];
    } catch (e) {
      rethrow;
    }
  }
}
