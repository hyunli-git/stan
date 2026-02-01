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

    _dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
      ),
    );
  }

  // Get today's feed (pre-generated briefings)
  Future<List<dynamic>> getFeed(String? userId) async {
    try {
      String url = '/feed';
      if (userId != null) {
        url += '?user_id=$userId';
      }
      final response = await _dio.get(url);
      return response.data['briefings'] ?? [];
    } catch (e) {
      rethrow;
    }
  }

  // Get all artists
  Future<List<dynamic>> getArtists(String? userId) async {
    try {
      String url = '/artists';
      if (userId != null) {
        url += '?user_id=$userId';
      }
      final response = await _dio.get(url);
      return response.data['artists'] ?? [];
    } catch (e) {
      rethrow;
    }
  }

  // Follow an artist
  Future<void> followArtist(String userId, String artistId) async {
    try {
      await _dio.post('/follow', data: {
        'user_id': userId,
        'artist_id': artistId,
      });
    } catch (e) {
      rethrow;
    }
  }

  // Unfollow an artist
  Future<void> unfollowArtist(String userId, String artistId) async {
    try {
      await _dio.post('/unfollow', data: {
        'user_id': userId,
        'artist_id': artistId,
      });
    } catch (e) {
      rethrow;
    }
  }

  // Generate briefing on-demand (legacy, still useful for testing)
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
}
