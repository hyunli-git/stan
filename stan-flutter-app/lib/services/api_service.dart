import 'package:dio/dio.dart';

// Supabase Edge Functions URL
const String supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://tdzlsdpubnicsoxqthzl.supabase.co',
);
const String supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkemxzZHB1Ym5pY3NveHF0aHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3Mzg0MDgsImV4cCI6MjA4NTMxNDQwOH0.C-nkm1xAeXu_NuWymaUDE9F4UGtdClfhrumQT-8dNMA',
);

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final String functionsUrl = '$supabaseUrl/functions/v1';

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: functionsUrl,
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $supabaseAnonKey',
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

  // Generate briefing via Supabase Edge Function
  Future<Map<String, dynamic>> generateBriefing({
    required String stanName,
    String? userId,
  }) async {
    try {
      final response = await _dio.post(
        '/generate-briefing',
        data: {'stanName': stanName},
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Get popular stans (returns static data for now)
  Future<Map<String, dynamic>> getPopularStans() async {
    return {
      'popular_stans': {
        'K-Pop': ['BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'aespa'],
        'Music': ['Taylor Swift', 'Olivia Rodrigo'],
        'Entertainment': ['Marvel'],
      }
    };
  }

  // Get today's briefings (empty for guests)
  Future<List<dynamic>> getTodaysBriefings(String? userId) async {
    // TODO: Implement with Supabase database
    return [];
  }
}
