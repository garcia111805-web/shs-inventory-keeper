import { useInventory } from '../context/InventoryContext';

export default function ToastContainer() {
  const { toasts, showToast } = useInventory();
  const colors = { success: '#15803d', error: '#b91c1c', warning: '#d97706' };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="px-4 py-3 rounded-xl shadow-2xl text-sm font-body cursor-pointer animate-slide-up"
          style={{ background: colors[t.type], color: 'white', minWidth: 240 }}
          onClick={() => {/* dismiss handled by timeout */}}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
