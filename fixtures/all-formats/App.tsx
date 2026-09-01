import icon from './assets/icon.png';
import badge from './assets/badge.png';
import photo from './assets/photo.jpg';
import sticker from './assets/sticker.webp';
import banner from './assets/photo.avif';
import spinner from './assets/spinner.svg';
import pulse from './assets/pulse.lottie';
import character from './assets/character.riv';

export function AllFormatsDemo() {
  return (
    <div>
      <img src={icon} alt="icon" />
      <img src={badge} alt="badge" />
      <img src={photo} alt="photo" />
      <img src={sticker} alt="sticker" />
      <img src={banner} alt="banner" />
      <img src={spinner} alt="spinner" />
      <div data-lottie={pulse} />
      <div data-rive={character} />
    </div>
  );
}
