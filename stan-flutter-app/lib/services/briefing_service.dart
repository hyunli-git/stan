import 'package:flutter/foundation.dart';
import '../models/briefing.dart';
import '../models/stan.dart';
import 'api_service.dart';

class BriefingService extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Briefing> _briefings = [];
  List<Stan> _popularStans = [];
  bool _isLoading = false;
  String? _error;

  List<Briefing> get briefings => _briefings;
  List<Stan> get popularStans => _popularStans;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadPopularStans() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _api.getPopularStans();
      final stansData = response['popular_stans'] as Map<String, dynamic>;

      _popularStans = [];
      stansData.forEach((category, stans) {
        for (var stanName in stans as List) {
          _popularStans.add(Stan(
            name: stanName as String,
            category: category,
            isPopular: true,
          ));
        }
      });

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadTodaysBriefings(String? userId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final briefingsData = await _api.getTodaysBriefings(userId);

      _briefings = briefingsData.map((data) {
        return Briefing.fromJson({
          'stan_name': data['stan_name'],
          'created_at': data['created_at'] ?? DateTime.now().toIso8601String(),
          ...data['briefing'],
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
