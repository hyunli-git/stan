import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../models/briefing.dart';

class BriefingCard extends StatelessWidget {
  final Briefing briefing;
  final VoidCallback? onTap;

  const BriefingCard({
    super.key,
    required this.briefing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with stan name and date
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      briefing.stanName,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(briefing.date),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Summary
              if (briefing.summary.isNotEmpty) ...[
                Text(
                  briefing.summary,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 16),
              ],

              // Topics preview
              if (briefing.topics.isNotEmpty) ...[
                ...briefing.topics.take(2).map(
                      (topic) => TopicPreview(topic: topic),
                    ),
                if (briefing.topics.length > 2)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '+ ${briefing.topics.length - 2} more topics',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
              ],

              const SizedBox(height: 16),

              // Footer with share and source count
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.share, size: 20),
                    onPressed: () {
                      _shareBriefing(context);
                    },
                    tooltip: 'Share',
                  ),
                  if (briefing.sources.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Icon(
                      Icons.link,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${briefing.sources.length} sources',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                  const Spacer(),
                  Text(
                    briefing.generatedBy,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final briefingDate = DateTime(date.year, date.month, date.day);

    if (briefingDate == today) {
      return 'Today';
    } else if (briefingDate == yesterday) {
      return 'Yesterday';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }

  void _shareBriefing(BuildContext context) {
    final text = '''
${briefing.stanName} Briefing - ${_formatDate(briefing.date)}

${briefing.summary}

Generated by STAN
''';
    Share.share(text);
  }
}

class TopicPreview extends StatelessWidget {
  final Topic topic;

  const TopicPreview({super.key, required this.topic});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            topic.title,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            topic.content.length > 150
                ? '${topic.content.substring(0, 150)}...'
                : topic.content,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[700],
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class FullTopicTile extends StatelessWidget {
  final Topic topic;

  const FullTopicTile({super.key, required this.topic});

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      title: Text(
        topic.title,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                topic.content,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[800],
                  height: 1.5,
                ),
              ),
              if (topic.sources.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Sources:',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 8),
                ...topic.sources.map(
                  (source) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      '• $source',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue[700],
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
