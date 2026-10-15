import { useCallback, useEffect, useState } from 'react';
import { api, session } from '../services/api';
import { useToast } from '../components/Toast';
import { useT } from '../i18n/LanguageContext';
import { isDone } from '../utils/waste';

// Shared data + collect/dispose workflow for the worker pages
export default function useWorkerTasks() {
  const toast = useToast();
  const t = useT();
  const currentUser = session.getUser() || {};
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [binVerifyRecord, setBinVerifyRecord] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recordsData, statsData] = await Promise.all([
        api.getWasteRecords({ workerName: currentUser.name, workerId: currentUser.id }),
        api.getWorkerStats(currentUser.name, currentUser.id)
      ]);
      setRecords(recordsData);
      setStats(statsData);
    } catch (err) {
      if (err.status !== 401) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.name, currentUser.id, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Stage 1: Pending/Assigned → Collected
  const handleCollect = async (record) => {
    if (record.status === 'Collected' || isDone(record)) return;
    try {
      setActionLoading(true);
      const res = await api.collectWasteRecord(record._id);
      toast.success(res.message);
      setSelectedTask(null);
      await loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 2: Collected → Completed (opens bin verification first)
  const handleStartDispose = (record) => {
    if (record.status !== 'Collected') { toast.info(t('worker.mustCollectFirst')); return; }
    setSelectedTask(null);
    setBinVerifyRecord(record);
  };

  const confirmDisposal = async (binVerified, binMismatchNote) => {
    if (!binVerifyRecord) return;
    try {
      setActionLoading(true);
      const res = await api.completeWasteRecord(binVerifyRecord._id, binVerified, binMismatchNote);
      toast.success(res.message);
      setBinVerifyRecord(null);
      await loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return {
    currentUser, records, stats, loading, actionLoading, loadData,
    selectedTask, setSelectedTask, binVerifyRecord, setBinVerifyRecord,
    handleCollect, handleStartDispose, confirmDisposal
  };
}
