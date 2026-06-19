import AssetView from "./AssetView";

export default async function AssetPage(props: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await props.params;
  return <AssetView symbol={symbol.toUpperCase()} />;
}
