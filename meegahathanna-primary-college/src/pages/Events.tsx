import PageHeader from '@/components/PageHeader';
import ContentBrowser from '@/components/ContentBrowser';
import { EventCard } from '@/components/ContentCards';
export default function Events() {
  return (
    <>
      <PageHeader
        title="Moments to come together."
        subtitle="School activities, celebrations and important dates for our families."
        kicker="Events & school life"
      />
      <section className="section container">
        <ContentBrowser
          kind="events"
          period
          emptyTitle="No upcoming events announced yet"
          emptyText="Confirmed dates will appear here. You can also browse past events using the filter."
          renderItem={(item) => <EventCard key={item.id} item={item} />}
        />
      </section>
    </>
  );
}
