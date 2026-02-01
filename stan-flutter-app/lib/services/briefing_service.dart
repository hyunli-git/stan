import 'package:flutter/foundation.dart';
import '../models/briefing.dart';
import '../models/artist.dart';
import 'api_service.dart';

class BriefingService extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Briefing> _briefings = [];
  List<Artist> _artists = [];
  bool _isLoading = false;
  String? _error;

  List<Briefing> get briefings => _briefings;
  List<Artist> get artists => _artists;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Load today's feed (pre-generated briefings)
  Future<void> loadFeed(String? userId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final feedData = await _api.getFeed(userId);

      _briefings = feedData.map((data) {
        return Briefing.fromJson({
          'id': data['id'],
          'stan_name': data['artist']?['name'] ?? 'Unknown',
          'category': data['artist']?['category'] ?? 'Music',
          'content': data['content'],
          'summary': data['summary'],
          'topics': data['topics'],
          'sources': data['sources'],
          'created_at': data['created_at'] ?? DateTime.now().toIso8601String(),
          'artist': data['artist'],
        });
      }).toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load all artists
  Future<void> loadArtists(String? userId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final artistsData = await _api.getArtists(userId);

      _artists = artistsData.map((data) {
        return Artist.fromJson(data);
      }).toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Follow an artist
  Future<void> followArtist(String userId, String artistId) async {
    try {
      await _api.followArtist(userId, artistId);
      // Update local state
      final index = _artists.indexWhere((a) => a.id == artistId);
      if (index != -1) {
        _artists[index] = _artists[index].copyWith(isFollowed: true);
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Unfollow an artist
  Future<void> unfollowArtist(String userId, String artistId) async {
    try {
      await _api.unfollowArtist(userId, artistId);
      // Update local state
      final index = _artists.indexWhere((a) => a.id == artistId);
      if (index != -1) {
        _artists[index] = _artists[index].copyWith(isFollowed: false);
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Generate briefing on-demand (for testing)
  Future<Briefing> generateBriefing(String stanName, String? userId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _api.generateBriefing(
        stanName: stanName,
        userId: userId,
      );

      final briefing = Briefing.fromJson({
        'stan_name': stanName,
        'created_at': DateTime.now().toIso8601String(),
        ...response,
      });

      _isLoading = false;
      notifyListeners();

      return briefing;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
}
