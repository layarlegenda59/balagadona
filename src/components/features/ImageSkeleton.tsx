import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ImageSkeletonProps {
  src: string
  alt: string
  className?: string
  skeletonClassName?: string
  children?: React.ReactNode
}

export default function ImageSkeleton({
  src,
  alt,
  className,
  skeletonClassName,
  children,
}: ImageSkeletonProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Image layer */}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <span className="text-2xl">🍽️</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Skeleton layer - only shows while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-20">
          <Skeleton className={cn('w-full h-full', skeletonClassName)} />
        </div>
      )}

      {/* Children layer - badges, overlays */}
      {children}
    </div>
  )
}
