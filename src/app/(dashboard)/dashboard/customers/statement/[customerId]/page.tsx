"use client"
import { useParams } from 'next/navigation';
import React, { useEffect } from 'react'

const page = () => {

  useEffect(() => {
    const res = fetch(`/api/customer/${id}/ledger`)
    .then(res => res.json())
    .then(data => console.log(data))  
  }, []);

  const params = useParams();
  const id = params.customerId;
  return (
    <div>page</div>
  )
}

export default page