import { useCallback, useMemo, useState } from 'react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import { Clock, Heart, MapPin, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/Select';
import { Button } from '~/components/Button';
import type { Location, Visitor } from '@prisma/client';
import Checkbox from '~/components/Checkbox';

const DURATIONS = [
  { value: 30, label: 'Quick Play (30 min)' },
  { value: 60, label: 'Fun Hour (60 min)' },
  { value: 90, label: 'Adventure Time (90 min)' },
  { value: 120, label: 'Mega Playtime (2 hours)' },
  { value: 180, label: 'All Day Fun (3 hours)' },
];

export type CheckInCardProps = {
  locations: Location[];
  visitors: Visitor[];
  refreshParks?: () => void;
};

export default function CheckInCard({
  locations,
  visitors,
  refreshParks,
}: CheckInCardProps) {
  const [selectedPark, setSelectedPark] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [selectedVisitors, setSelectedVisitors] = useState<string[]>([]);
  const csrf = useAuthenticityToken();

  const sortedVisitors = useMemo(
    () => visitors.sort((a, b) => a.name.localeCompare(b.name)),
    [visitors]
  );

  const handleVisitorToggle = (visitorId: string) => {
    setSelectedVisitors((prev) =>
      prev.includes(visitorId)
        ? prev.filter((id) => id !== visitorId)
        : [...prev, visitorId]
    );
  };

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);

      // Submit the form data
      fetch('/check-action', {
        method: 'POST',
        body: formData,
      })
        .then(() => {
          // Reset form after successful submission
          setSelectedPark('');
          setDuration('');
          setSelectedVisitors([]);

          // Refresh the parks list if refresh function provided
          if (refreshParks) {
            setTimeout(refreshParks, 500);
          }
        })
        .catch((error) => {
          // Handle error silently in production
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error submitting check-in:', error);
          }
        });
    },
    [refreshParks]
  );

  return (
    <div className="park-card p-5">
      <div className="mb-4">
        <h3 className="handwritten text-2xl text-primary flex items-center gap-2">
          <Heart className="w-6 h-6 bounce-gentle" />
          Let&apos;s Go Play!
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Pick a park and let the adventure begin! 🚀
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="intent" value="check-in" />
        {/* Park Selection */}
        <div className="space-y-3">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex items-center gap-2 handwritten text-lg text-primary">
            <MapPin className="w-5 h-5 wiggle" />
            Choose Your Adventure Spot
            <input type="hidden" name="locationId" value={selectedPark} />
          </label>
          <Select value={selectedPark} onValueChange={setSelectedPark} required>
            <SelectTrigger className="sketchy-border">
              <SelectValue placeholder="Where shall we explore today?" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => {
                const locationName = location.nickname
                  ? `${location.nickname} (${location.name})`
                  : location.name;
                return (
                  <SelectItem key={location.id} value={location.id}>
                    {locationName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Duration Selection */}
          <div className="space-y-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="flex items-center gap-2 handwritten text-lg text-primary">
              <Clock className="w-5 h-5 wiggle" />
              How Long Will You Play?
            </label>
            <input type="hidden" name="duration" value={duration} />
            <Select value={duration} onValueChange={setDuration} required>
              <SelectTrigger className="sketchy-border">
                <SelectValue placeholder="Pick your playtime! ⏰" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value.toString()}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kids Selection */}
          <div className="space-y-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="handwritten text-lg text-primary">
              Who&apos;s Ready for Fun? 🎉
            </label>
            <div className="space-y-3">
              {sortedVisitors.map((visitor) => (
                <div key={visitor.id} className="kid-bubble p-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={visitor.id}
                      checked={selectedVisitors.includes(visitor.id)}
                      onCheckedChange={() => handleVisitorToggle(visitor.id)}
                      className="border-primary data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor={visitor.id}
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <span className="handwritten text-lg">
                        {visitor.name}
                      </span>
                    </label>
                  </div>
                  {selectedVisitors.includes(visitor.id) && (
                    <input type="hidden" name="visitorId" value={visitor.id} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full sketchy-border bg-primary hover:bg-primary/90 text-white py-6 text-lg handwritten"
            disabled={
              !selectedPark || !duration || selectedVisitors.length === 0
            }
          >
            <Users className="w-5 h-5 mr-2 bounce-gentle" />
            Start the Adventure! 🎯
          </Button>
        </div>
      </form>
    </div>
  );
}
