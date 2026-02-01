import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/briefing_service.dart';
import '../models/artist.dart';

class ArtistsScreen extends StatefulWidget {
  const ArtistsScreen({super.key});

  @override
  State<ArtistsScreen> createState() => _ArtistsScreenState();
}

class _ArtistsScreenState extends State<ArtistsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadArtists();
    });
  }

  Future<void> _loadArtists() async {
    final auth = context.read<AuthService>();
    final userId = auth.currentUser?.id;
    await context.read<BriefingService>().loadArtists(userId);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final isLoggedIn = auth.currentUser != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Artists'),
      ),
      body: Consumer<BriefingService>(
        builder: (context, service, child) {
          if (service.isLoading && service.artists.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (service.artists.isEmpty) {
            return const Center(
              child: Text('No artists available'),
            );
          }

          return RefreshIndicator(
            onRefresh: _loadArtists,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: service.artists.length,
              itemBuilder: (context, index) {
                final artist = service.artists[index];
                return _ArtistCard(
                  artist: artist,
                  isLoggedIn: isLoggedIn,
                  onFollowToggle: () => _toggleFollow(artist),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _toggleFollow(Artist artist) async {
    final auth = context.read<AuthService>();
    final userId = auth.currentUser?.id;

    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to follow artists')),
      );
      return;
    }

    try {
      final service = context.read<BriefingService>();
      if (artist.isFollowed) {
        await service.unfollowArtist(userId, artist.id);
      } else {
        await service.followArtist(userId, artist.id);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}

class _ArtistCard extends StatelessWidget {
  final Artist artist;
  final bool isLoggedIn;
  final VoidCallback onFollowToggle;

  const _ArtistCard({
    required this.artist,
    required this.isLoggedIn,
    required this.onFollowToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          radius: 28,
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: Text(
            artist.name[0].toUpperCase(),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
          ),
        ),
        title: Text(
          artist.name,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          artist.category,
          style: TextStyle(color: Colors.grey[600]),
        ),
        trailing: isLoggedIn
            ? FilledButton.tonal(
                onPressed: onFollowToggle,
                style: FilledButton.styleFrom(
                  backgroundColor: artist.isFollowed
                      ? Colors.grey[200]
                      : Theme.of(context).colorScheme.primaryContainer,
                ),
                child: Text(
                  artist.isFollowed ? 'Following' : 'Follow',
                  style: TextStyle(
                    color: artist.isFollowed
                        ? Colors.grey[700]
                        : Theme.of(context).colorScheme.primary,
                  ),
                ),
              )
            : null,
      ),
    );
  }
}
