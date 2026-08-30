import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../ui';
import { Play, CheckCircle2, Clock, MapPin, Eye, MessageSquare } from 'lucide-react';
import { useMentorContext } from '@/context/MentorContext';
import styles from './LearningProgressPanel.module.css';

const TYPE_LABELS = {
  course: 'progress.types.course',
  lesson: 'progress.types.lesson',
  decision_check: 'progress.types.decisionCheck',
  practical_card: 'progress.types.practicalCard',
  financial_tool: 'progress.types.financialTool',
  guide: 'progress.types.guide'
};

const STATUS_MAP = {
  started: { labelKey: 'progress.status.started', color: 'bg-blue-100 text-blue-800', moduleClass: styles.statusStarted },
  in_progress: { labelKey: 'progress.status.inProgress', color: 'bg-yellow-100 text-yellow-800', moduleClass: styles.statusInProgress },
  completed: { labelKey: 'progress.status.completed', color: 'bg-green-100 text-green-800', moduleClass: styles.statusCompleted }
};

export const LearningProgressPanel = () => {
  const { t } = useTranslation('learning');
  const [continueItems, setContinueItems] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mentorContext = useMentorContext();
  const isContextualMentorEnabled = import.meta.env.VITE_FF_CONTEXTUAL_MENTOR === 'true';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [continueRes, recentRes, completedRes] = await Promise.all([
        api.learningProgress.getContinue(3),
        api.learningProgress.getRecent(3),
        api.learningProgress.getCompleted(3)
      ]);

      setContinueItems(continueRes.items || []);
      setRecentItems(recentRes.items || []);
      setCompletedItems(completedRes.items || []);
    } catch (err) {
      console.error(err);
      setError(t('progress.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const navigateToItem = (item) => {
    let route = '/app';
    if (item.contentType === 'course') route = '/app/enrollments';
    else if (item.contentType === 'decision_check') route = `/app/decision-checks/${item.contentCode || item.contentId}`;
    else if (item.contentType === 'practical_card') route = `/app/practical-cards/${item.contentCode || item.contentId}`;
    else if (item.contentType === 'lesson') route = '/app/enrollments';

    window.location.href = route; // Using window.location.href for simplicity, or we could use react-router-dom useNavigate if passed down. We'll stick to a generic href for now.
  };

  const toggleContinueLater = async (item) => {
    try {
      await api.learningProgress.update(item.contentType, item.contentId, {
        status: item.status,
        continueLater: !item.continueLater
      });
      fetchData(); // Refresh lists
    } catch (err) {
      console.error(err);
    }
  };

  const renderItemCard = (item, actionLabel, ActionIcon, primaryAction) => (
    <div key={item.id || `${item.contentType}-${item.contentId}`} className={`border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm hover:shadow-md transition-shadow ${styles.card}`}>
      <div>
        <div className={`flex justify-between items-start mb-2 ${styles.cardTop}`}>
          <span className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${styles.typeLabel}`}>
            {TYPE_LABELS[item.contentType] ? t(TYPE_LABELS[item.contentType]) : item.contentType}
          </span>
          {item.status && STATUS_MAP[item.status] && (
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_MAP[item.status].color} ${styles.status} ${STATUS_MAP[item.status].moduleClass}`}>
              {t(STATUS_MAP[item.status].labelKey)}
            </span>
          )}
        </div>
        <h4 className={`font-medium text-gray-900 mb-1 line-clamp-2 ${styles.cardTitle}`} title={item.title || item.contentCode}>
          {item.title || item.contentCode || t('progress.contentFallback')}
        </h4>
        {item.progressPercent !== undefined && item.progressPercent !== null && (
          <div className={`w-full bg-gray-200 rounded-full h-2 mb-3 ${styles.progressTrack}`}>
            <div className={`bg-blue-600 h-2 rounded-full ${styles.progressFill}`} style={{ width: `${Math.min(100, item.progressPercent)}%` }}></div>
          </div>
        )}
      </div>
      <div className={`mt-4 flex space-x-2 items-center ${styles.cardActions}`}>
        <Button variant="primary" size="sm" className={`flex-1 flex justify-center items-center ${styles.cardActionPrimary}`} onClick={() => primaryAction(item)}>
          <ActionIcon className="w-4 h-4 mr-1" size={16} />
          {actionLabel}
        </Button>
        {isContextualMentorEnabled && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => {
              if (mentorContext?.openMentorWithContext) {
                mentorContext.openMentorWithContext({
                  contextType: 'learning_progress',
                  source: 'progress',
                  entityCode: item.contentCode || item.contentId,
                  title: item.title,
                  route: window.location.pathname
                });
              }
            }}
            title={t('progress.askMentor')}
          >
            <MessageSquare className="w-4 h-4" size={16} />
          </Button>
        )}
        {item.status !== 'completed' && (
          <Button variant="outline" size="sm" onClick={() => toggleContinueLater(item)} title={item.continueLater ? t('progress.removeContinueLater') : t('progress.continueLater')}>
            <Clock className={`w-4 h-4 ${item.continueLater ? 'text-blue-600' : 'text-gray-400'} ${item.continueLater ? styles.laterIconActive : styles.laterIcon}`} size={16} />
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className={`p-6 bg-gray-50 rounded-xl animate-pulse ${styles.loading}`}>{t('progress.loading')}</div>;
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 rounded-xl text-red-600 flex justify-between items-center ${styles.errorBox}`}>
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={fetchData}>{t('progress.retry')}</Button>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${styles.panel}`}>
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-4 flex items-center ${styles.sectionTitle}`}>
          <MapPin className={`w-5 h-5 mr-2 text-blue-600 ${styles.sectionIconContinue}`} size={20} />
          {t('progress.continueHeading')}
        </h3>
        {continueItems.length === 0 ? (
          <p className={`text-sm text-gray-500 ${styles.emptyText}`}>{t('progress.continueEmpty')}</p>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${styles.cardGrid}`}>
            {continueItems.map(item => renderItemCard(item, t('progress.continue'), Play, navigateToItem))}
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${styles.twoCol}`}>
        <div>
          <h3 className={`text-lg font-bold text-gray-900 mb-4 flex items-center ${styles.sectionTitle}`}>
            <Eye className={`w-5 h-5 mr-2 text-gray-600 ${styles.sectionIconRecent}`} size={20} />
            {t('progress.recentHeading')}
          </h3>
          {recentItems.length === 0 ? (
            <p className={`text-sm text-gray-500 ${styles.emptyText}`}>{t('progress.recentEmpty')}</p>
          ) : (
            <div className={`space-y-3 ${styles.rowList}`}>
              {recentItems.map(item => (
                 <div key={`${item.contentType}-${item.contentId}`} className={`flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer ${styles.row}`} onClick={() => navigateToItem(item)}>
                   <div>
                     <p className={`text-sm font-medium text-gray-900 line-clamp-1 ${styles.rowTitle}`}>{item.title || item.contentCode || t('progress.contentFallback')}</p>
                     <p className={`text-xs text-gray-500 ${styles.rowMeta}`}>{TYPE_LABELS[item.contentType] ? t(TYPE_LABELS[item.contentType]) : item.contentType}</p>
                   </div>
                   {item.status && STATUS_MAP[item.status] && (
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_MAP[item.status].color} ${styles.status} ${STATUS_MAP[item.status].moduleClass}`}>
                        {t(STATUS_MAP[item.status].labelKey)}
                      </span>
                    )}
                 </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className={`text-lg font-bold text-gray-900 mb-4 flex items-center ${styles.sectionTitle}`}>
            <CheckCircle2 className={`w-5 h-5 mr-2 text-green-600 ${styles.sectionIconCompleted}`} size={20} />
            {t('progress.completedHeading')}
          </h3>
          {completedItems.length === 0 ? (
            <p className={`text-sm text-gray-500 ${styles.emptyText}`}>{t('progress.completedEmpty')}</p>
          ) : (
            <div className={`space-y-3 ${styles.rowList}`}>
              {completedItems.map(item => (
                 <div key={`${item.contentType}-${item.contentId}`} className={`flex items-center justify-between p-3 border rounded-lg bg-green-50 ${styles.row} ${styles.rowDone}`}>
                   <div>
                     <p className={`text-sm font-medium text-green-900 line-clamp-1 ${styles.rowTitle} ${styles.rowTitleDone}`}>{item.title || item.contentCode || t('progress.contentFallback')}</p>
                     <p className={`text-xs text-green-700 ${styles.rowMeta} ${styles.rowMetaDone}`}>{TYPE_LABELS[item.contentType] ? t(TYPE_LABELS[item.contentType]) : item.contentType}</p>
                   </div>
                   <CheckCircle2 className={`w-5 h-5 text-green-600 ${styles.rowDoneIcon}`} size={20} />
                 </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningProgressPanel;
