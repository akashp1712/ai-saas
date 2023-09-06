'use client';

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
    useEffect(() => {
        Crisp.configure("337a642f-5f66-4f21-b5dd-7d3ae87bd61b");
    }, []);

    return null;

};
