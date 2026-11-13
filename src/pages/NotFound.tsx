import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';

export default function NotFound() {
  return (
    <div className="wrap page">
      <Empty icon="search" title="Sahifa topilmadi" text="Bunday sahifa mavjud emas." action={<Link to="/" className="btn coral">Bosh sahifa</Link>} />
    </div>
  );
}
