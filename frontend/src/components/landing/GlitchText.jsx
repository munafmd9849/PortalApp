const GlitchText = ({
  children,
  speed = 0.5,
  enableShadows = true,
  enableOnHover = false,
  className = '',
}) => {
  const inlineStyles = {
    // Faster, stronger glitch
    '--after-duration': `${speed * 1.5}s`,
    '--before-duration': `${speed * 1}s`,
    '--after-shadow': enableShadows ? '-4px 0 red' : 'none',
    '--before-shadow': enableShadows ? '4px 0 cyan' : 'none',
  };

  // Base styles: keep it inline with heading text, no background block
  const baseClasses =
    'relative inline-block align-middle select-none whitespace-nowrap';

  // Pseudo-element classes: only duplicate the text + shadows, no background box
  const pseudoClasses = !enableOnHover
    ? 'after:content-[attr(data-text)] after:absolute after:top-0 after:left-[1px] after:overflow-hidden after:[clip-path:inset(0_0_0_0)] after:[text-shadow:var(--after-shadow)] after:animate-glitch-after after:opacity-90 ' +
      'before:content-[attr(data-text)] before:absolute before:top-0 before:left-[-1px] before:overflow-hidden before:[clip-path:inset(0_0_0_0)] before:[text-shadow:var(--before-shadow)] before:animate-glitch-before before:opacity-90'
    : "after:content-[''] after:absolute after:top-0 after:left-[1px] after:overflow-hidden after:[clip-path:inset(0_0_0_0)] after:opacity-0 " +
      "before:content-[''] before:absolute before:top-0 before:left-[-1px] before:overflow-hidden before:[clip-path:inset(0_0_0_0)] before:opacity-0 " +
      'hover:after:content-[attr(data-text)] hover:after:opacity-100 hover:after:[text-shadow:var(--after-shadow)] hover:after:animate-glitch-after ' +
      'hover:before:content-[attr(data-text)] hover:before:opacity-100 hover:before:[text-shadow:var(--before-shadow)] hover:before:animate-glitch-before';
  const combinedClasses = `${baseClasses} ${pseudoClasses} ${className}`;
  return (
    <span
      style={inlineStyles}
      data-text={children}
      className={combinedClasses}
    >
      {children}
    </span>
  );
};

export default GlitchText;
