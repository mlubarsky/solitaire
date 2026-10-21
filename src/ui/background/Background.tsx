import { memo } from 'react';
import { themeById, type ThemeId } from '../../themes/themes';
import { FeltBackground } from './FeltBackground';
import { PixelBackground } from './PixelBackground';

/** The selected table background, fixed behind the board. */
function BackgroundView({ theme, animate }: { theme: ThemeId; animate: boolean }) {
  const { scene } = themeById(theme);
  return (
    <div className="background" data-background={theme} data-testid="background">
      {scene ? <PixelBackground scene={scene} animate={animate} /> : <FeltBackground />}
    </div>
  );
}

export const Background = memo(BackgroundView);
