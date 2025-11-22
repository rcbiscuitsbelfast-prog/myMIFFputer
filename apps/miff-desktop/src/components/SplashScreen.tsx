interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <div className={`miff-splash ${visible ? 'is-visible' : 'is-hidden'}`} aria-hidden={!visible}>
      <div className="miff-splash__mark">
        <span>made with</span>
        <strong>MIFF</strong>
        <span>in mind</span>
      </div>
    </div>
  );
}
