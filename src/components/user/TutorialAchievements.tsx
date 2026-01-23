import React, { useMemo } from 'react';
import { Trophy, Award, Star, Crown, CheckCircle, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VideoTutorial } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils';

interface TutorialAchievementsProps {
  videoTutorials: VideoTutorial[];
  isTutorialWatched: (tutorialId: string) => boolean;
  watchedCount: number;
  compact?: boolean;
}

interface TopicAchievement {
  topic: string;
  totalTutorials: number;
  watchedTutorials: number;
  isCompleted: boolean;
  icon: React.ElementType;
  color: string;
}

const TOPIC_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  'Getting Started': { icon: Star, color: 'text-yellow-500' },
  'Products': { icon: Award, color: 'text-blue-500' },
  'Orders': { icon: Trophy, color: 'text-green-500' },
  'Payments': { icon: Crown, color: 'text-purple-500' },
  'General': { icon: Star, color: 'text-orange-500' },
};

const getTopicConfig = (topic: string) => {
  return TOPIC_ICONS[topic] || { icon: Award, color: 'text-primary' };
};

export const TutorialAchievements: React.FC<TutorialAchievementsProps> = ({
  videoTutorials,
  isTutorialWatched,
  watchedCount,
  compact = false,
}) => {
  // Calculate achievements
  const { topicAchievements, allCompleted, progressPercentage } = useMemo(() => {
    // Group tutorials by topic
    const grouped: Record<string, VideoTutorial[]> = {};
    videoTutorials.forEach(tutorial => {
      const topic = tutorial.topic || 'General';
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(tutorial);
    });

    // Calculate achievements per topic
    const achievements: TopicAchievement[] = Object.entries(grouped).map(([topic, tutorials]) => {
      const watched = tutorials.filter(t => isTutorialWatched(t.id)).length;
      const config = getTopicConfig(topic);
      return {
        topic,
        totalTutorials: tutorials.length,
        watchedTutorials: watched,
        isCompleted: watched === tutorials.length,
        icon: config.icon,
        color: config.color,
      };
    });

    const allDone = watchedCount === videoTutorials.length && videoTutorials.length > 0;
    const progress = videoTutorials.length > 0 
      ? Math.round((watchedCount / videoTutorials.length) * 100) 
      : 0;

    return {
      topicAchievements: achievements,
      allCompleted: allDone,
      progressPercentage: progress,
    };
  }, [videoTutorials, isTutorialWatched, watchedCount]);

  const completedTopics = topicAchievements.filter(a => a.isCompleted).length;

  if (videoTutorials.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Master Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
            allCompleted
              ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30"
              : "bg-muted text-muted-foreground border border-border"
          )}
        >
          {allCompleted ? (
            <>
              <Crown className="w-3.5 h-3.5" />
              Tutorial Master
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" />
              {progressPercentage}%
            </>
          )}
        </div>

        {/* Topic Badges */}
        {topicAchievements.map(achievement => (
          <div
            key={achievement.topic}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all",
              achievement.isCompleted
                ? `bg-${achievement.color.replace('text-', '')}/10 ${achievement.color} border border-current/30`
                : "bg-muted/50 text-muted-foreground"
            )}
            title={`${achievement.topic}: ${achievement.watchedTutorials}/${achievement.totalTutorials}`}
          >
            {achievement.isCompleted ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <achievement.icon className="w-3 h-3 opacity-50" />
            )}
            {achievement.topic}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Master Achievement */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="font-semibold">Achievements</span>
        </div>
        <Badge variant={allCompleted ? "default" : "secondary"}>
          {completedTopics}/{topicAchievements.length} badges
        </Badge>
      </div>

      {/* Master Badge */}
      <div
        className={cn(
          "relative rounded-xl border-2 p-4 transition-all overflow-hidden",
          allCompleted
            ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10"
            : "border-border bg-muted/30"
        )}
      >
        {allCompleted && (
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-amber-500/5 animate-pulse" />
        )}
        <div className="flex items-center gap-4 relative z-10">
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shrink-0",
              allCompleted
                ? "bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30"
                : "bg-muted border-2 border-dashed border-muted-foreground/30"
            )}
          >
            {allCompleted ? (
              <Crown className="w-7 h-7 text-white" />
            ) : (
              <Lock className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-bold text-lg",
              allCompleted ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
            )}>
              Tutorial Master
            </h4>
            <p className="text-sm text-muted-foreground">
              {allCompleted
                ? "Congratulations! You've completed all tutorials!"
                : `Complete all ${videoTutorials.length} tutorials to earn this badge`}
            </p>
            {!allCompleted && (
              <div className="mt-2 flex items-center gap-2">
                <Progress value={progressPercentage} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground">
                  {watchedCount}/{videoTutorials.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topic Achievement Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topicAchievements.map(achievement => {
          const IconComponent = achievement.icon;
          return (
            <div
              key={achievement.topic}
              className={cn(
                "rounded-lg border p-3 transition-all",
                achievement.isCompleted
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border bg-muted/20"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    achievement.isCompleted
                      ? `bg-gradient-to-br from-green-500 to-emerald-500`
                      : "bg-muted"
                  )}
                >
                  {achievement.isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <IconComponent className={cn("w-4 h-4", achievement.color, "opacity-50")} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className={cn(
                    "font-medium text-sm truncate",
                    achievement.isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}>
                    {achievement.topic}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    {achievement.watchedTutorials}/{achievement.totalTutorials} done
                  </p>
                </div>
              </div>
              <Progress 
                value={(achievement.watchedTutorials / achievement.totalTutorials) * 100} 
                className="h-1.5"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
