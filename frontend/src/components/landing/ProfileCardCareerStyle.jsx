import React from "react";
import { IconBrandLinkedin, IconMail } from "@tabler/icons-react";
import TiltedCard from "./TiltedCard";

/**
 * Same style as Career Services team cards: TiltedCard with full image,
 * gradient overlay, name + title at bottom, LinkedIn/email top-right on hover.
 */
export default function ProfileCardCareerStyle({
  name = "Student Name",
  title = "Company • Role",
  avatarUrl = "",
  testimonial = "",
  linkedinUrl,
  emailHref,
}) {
  const height = "clamp(220px, 42svh, 280px)";
  const radius = "rounded-[16px]";

  return (
    <div className="relative w-full h-full min-h-[220px]">
      <TiltedCard
        imageSrc={avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop"}
        altText={`${name} - ${title}`}
        captionText={testimonial || `${name} • ${title}`}
        containerHeight={height}
        containerWidth="100%"
        imageHeight={height}
        imageWidth="100%"
        rotateAmplitude={7}
        scaleOnHover={1.04}
        showMobileWarning={false}
        showTooltip={true}
        displayOverlayContent={true}
        imageRadiusClassName={radius}
        overlayContent={
          <div className={`h-full w-full ${radius} overflow-hidden relative`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* LinkedIn + Email top right, visible on hover (desktop) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none transition-opacity duration-200 lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto">
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                  aria-label={`Open ${name} LinkedIn`}
                  title="LinkedIn"
                >
                  <IconBrandLinkedin size={16} />
                </a>
              )}
              {emailHref && (
                <a
                  href={emailHref}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                  aria-label={`Email ${name}`}
                  title="Email"
                >
                  <IconMail size={16} />
                </a>
              )}
            </div>
            <div className="absolute left-4 right-4 bottom-4">
              <div className="transition-opacity duration-200 lg:group-hover:opacity-0">
                <div className="text-white font-semibold text-lg leading-tight">
                  {name}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white/90 text-sm font-semibold truncate">
                      {title}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
