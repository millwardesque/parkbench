import { type ParkWithVisitors } from '~/utils/checkin.server';
import VisitorBadge from './VisitorBadge';

export type ParkCardProps = {
  park: ParkWithVisitors;
  myUserId: string;
};

export default function ParkCard({ park, myUserId }: ParkCardProps) {
  const primaryName = park.nickname ? park.nickname : park.name;
  const secondaryName = park.nickname ? park.name : null;

  return (
    <div key={park.name} className="park-card p-5">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="handwritten text-xl text-primary">
            {primaryName}
            {secondaryName && (
              <div className="text-sm text-muted-foreground">
                ({secondaryName})
              </div>
            )}
          </h3>
          <span className="handwritten text-base">
            {park.visitors.length} adventurer
            {park.visitors.length !== 1 ? 's' : ''} playing!
          </span>
        </div>
      </div>

      {park.visitors.length === 0 ? (
        <div className="text-center py-6 kid-bubble">
          <div className="text-4xl mb-2">🌙</div>
          <p className="text-muted-foreground handwritten text-lg">
            No one&apos;s here...
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to start the fun!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {park.visitors.map((visitor) => (
            <VisitorBadge
              key={visitor.id}
              name={visitor.name}
              checkInAt={visitor.checkin.checkin_at}
              estimatedCheckoutAt={visitor.checkin.est_checkout_at}
              isMyVisitor={visitor.owner_id === myUserId}
              parentName={visitor.parent_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
