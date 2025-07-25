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
  return (
    <ul>
      {parks.map((park) => (
        <li key={park.id?.toString()} className="px-6 py-4">
          <ParkCard myUserId={myUserId} park={park} />
        </li>
      ))}
    </ul>
  );
}
