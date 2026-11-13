import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import { Icon } from '../components/Icon';
import { PageHead, useWorn } from '../components/ui';
import { fmt } from '../data';
import { BODY_LABEL } from '../sizing';
import { toast, useStore } from '../store';

export default function Profile() {
  const profile = useStore((s) => s.profile);
  const orders = useStore((s) => s.orders);
  const looks = useStore((s) => s.looks);
  const wishlist = useStore((s) => s.wishlist);
  const outfit = useStore((s) => s.outfit);
  const { updateProfile, reset } = useStore.getState();
  const worn = useWorn(outfit);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);

  const spent = orders.filter((o) => !o.cancelled).reduce((a, o) => a + o.total, 0);

  return (
    <div className="wrap page">
      <PageHead kicker="Profil" title={profile.name ? `Salom, ${profile.name}` : 'Mening profilim'} />
      <div className="profile-layout">
        <div className="stack">
          <section className="card">
            <h3>Shaxsiy ma’lumotlar</h3>
            <div className="form2">
              <label className="field"><span>Ism</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="field"><span>Telefon</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" /></label>
            </div>
            <button className="btn ink" onClick={() => { updateProfile({ name: name.trim(), phone: phone.trim() }); toast('Saqlandi'); }}>Saqlash</button>
          </section>

          <section className="card">
            <div className="row between">
              <h3>Tana o‘lchamlari</h3>
              <Link to="/size" className="btn sm ghost"><Icon name="ruler" size={16} /> Tahrirlash</Link>
            </div>
            {!profile.measured && <p className="warn-note"><Icon name="spark" size={14} /> O‘lchamlar AI tomonidan taxmin qilingan. Aniqroq natija uchun o‘lchab kiriting.</p>}
            <div className="metrics">
              <div><small>Bo‘y</small><b>{profile.height} sm</b></div>
              <div><small>Vazn</small><b>{profile.weight} kg</b></div>
              <div><small>Tana</small><b>{BODY_LABEL[profile.body]}</b></div>
              <div><small>Ko‘krak</small><b>{profile.chest} sm</b></div>
              <div><small>Bel</small><b>{profile.waist} sm</b></div>
              <div><small>Son</small><b>{profile.hips} sm</b></div>
              <div><small>Oyoq</small><b>{profile.shoe}</b></div>
            </div>
          </section>

          <section className="card premium">
            <div>
              <span className="ai-tag"><Icon name="spark" size={14} /> Premium AI</span>
              <h3>Shaxsiy stilist va aniqroq o‘lcham</h3>
              <p>Cheksiz AI obrazlar, kengaytirilgan moslik xaritasi, narx tushishi haqida birinchi bo‘lib xabar. Oyiga 29 000 so‘m.</p>
            </div>
            <button className={'btn ' + (profile.premium ? 'ghost' : 'coral')} onClick={() => { updateProfile({ premium: !profile.premium }); toast(profile.premium ? 'Premium o‘chirildi' : 'Premium faollashtirildi'); }}>
              {profile.premium ? 'Faol ✓ — o‘chirish' : 'Ulash'}
            </button>
          </section>

          <section className="links-grid">
            <Link to="/orders" className="card link-card"><Icon name="box" /><b>Buyurtmalar</b><span>{orders.length}</span></Link>
            <Link to="/looks" className="card link-card"><Icon name="layers" /><b>Looklarim</b><span>{looks.length}</span></Link>
            <Link to="/wishlist" className="card link-card"><Icon name="heart" /><b>Saralangan</b><span>{wishlist.length}</span></Link>
            <div className="card link-card"><Icon name="chart" /><b>Xarid summasi</b><span>{fmt(spent)}</span></div>
          </section>

          <button className="link danger" onClick={() => { if (confirm('Barcha ma’lumotlar (savat, buyurtmalar, profil) o‘chirilsinmi?')) { reset(); toast('Ma’lumotlar tozalandi'); } }}>
            Barcha ma’lumotlarni tozalash
          </button>
        </div>
        <section className="card profile-avatar">
          <Avatar3D height={profile.height} weight={profile.weight} body={profile.body} worn={worn} />
          <Link to="/fitting" className="btn ink full"><Icon name="cube" /> 3D xonaga o‘tish</Link>
        </section>
      </div>
    </div>
  );
}
