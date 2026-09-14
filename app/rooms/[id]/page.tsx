import RoomClient from '@/components/RoomClient';
export default async function RoomPage({params}:{params:Promise<{id:string}>}){return <RoomClient id={(await params).id}/>;}
