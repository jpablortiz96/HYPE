import ProfileView from "./ProfileView";

export default async function ProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <ProfileView slug={slug} />;
}
