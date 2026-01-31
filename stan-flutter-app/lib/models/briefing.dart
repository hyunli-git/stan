class Briefing {
  final String content;
  final String summary;
  final List<String> sources;
  final List<Topic> topics;
  final String generatedBy;
  final Map<String, dynamic>? metadata;

  Briefing({
    required this.content,
    required this.summary,
    required this.sources,
    required this.topics,
    required this.generatedBy,
    this.metadata,
  });

  factory Briefing.fromJson(Map<String, dynamic> json) {
    return Briefing(
      content: json['content'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      sources: List<String>.from(json['sources'] ?? []),
      topics: (json['topics'] as List<dynamic>?)
              ?.map((t) => Topic.fromJson(t as Map<String, dynamic>))
              .toList() ??
          [],
      generatedBy: json['generated_by'] as String? ?? 'Unknown',
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'content': content,
      'summary': summary,
      'sources': sources,
      'topics': topics.map((t) => t.toJson()).toList(),
      'generated_by': generatedBy,
      'metadata': metadata,
    };
  }
}

class Topic {
  final String title;
  final String content;
  final List<String> sources;
  final String category;
  final int priority;

  Topic({
    required this.title,
    required this.content,
    required this.sources,
    required this.category,
    required this.priority,
  });

  factory Topic.fromJson(Map<String, dynamic> json) {
    return Topic(
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      sources: List<String>.from(json['sources'] ?? []),
      category: json['category'] as String? ?? 'general',
      priority: json['priority'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'content': content,
      'sources': sources,
      'category': category,
      'priority': priority,
    };
  }
}
