import { type ParkWithVisitors } from '~/utils/checkin.server';
import ParkCard from './ParkCard';

type ParkListProps = {
  myUserId: string;
  parks: ParkWithVisitors[];
};

/**
 * A list of parks and their current visitors
 */
export default function ParkList({ parks, myUserId }: ParkListProps) {
  if (parks.length === 0) {
    return (
      <div className="px-6 py-4 text-center text-gray-500">
        No one is currently checked in at any park
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {parks.map((park) => (
        <li key={park.id?.toString()} className="px-6 py-4">
          <ParkCard myUserId={myUserId} park={park} />
        </li>
      ))}
    </ul>
  );
}
