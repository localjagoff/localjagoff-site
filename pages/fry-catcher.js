// The previous game remains in legacy/arcade and Git history.
export default function RetiredArcadeGame() { return null; }
export function getServerSideProps() { return { redirect: { destination: '/arcade', permanent: false } }; }
